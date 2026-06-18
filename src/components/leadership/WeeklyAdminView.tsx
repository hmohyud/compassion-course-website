import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  listAllWeeklyContent,
  saveWeeklyContent,
  deleteWeeklyContent,
  type WeeklyContent,
  type RequiredRole,
} from '../../services/weeklyContentService';
import LessonContentEditor from './LessonContentEditor';

// Embeddable weekly-content admin view. Same workflows as the standalone
// /admin-portal/weekly page, but without Layout/route guards — meant to
// be rendered inside the LeadershipDashboardPage's Admin tab. The parent
// gates on isAdmin already, and Firestore + Storage rules are the real wall.

const WeeklyAdminView: React.FC = () => {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<WeeklyContent[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('loading');
  const [editing, setEditing] = useState<WeeklyContent | null>(null);
  const [editingContentWeek, setEditingContentWeek] = useState<WeeklyContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setFetchState('loading');
    try {
      const all = await listAllWeeklyContent();
      setWeeks(all);
      setFetchState('idle');
    } catch (err) {
      console.error('Failed to load weekly list', err);
      setFetchState('error');
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!editing || !user?.email) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveWeeklyContent(editing, user.email);
      setSuccess(`Week ${editing.weekNumber} saved.`);
      setEditing(null);
      await refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Save failed: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (week: WeeklyContent) => {
    if (!window.confirm(`Delete Week ${week.weekNumber}? This removes the metadata doc but does NOT delete the files from Storage.`)) return;
    try {
      await deleteWeeklyContent(week.weekNumber);
      await refresh();
      setSuccess(`Week ${week.weekNumber} deleted.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Delete failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="weekly-admin-view" style={{ maxWidth: 1100 }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#0d9488', margin: 0 }}>Manage Lessons</h2>
        <p style={{ color: '#52525b', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
          Edit the 52 weekly lessons. "Edit content" opens the visual / HTML editor with checkpoints; "Settings" edits the release date, role, and publish state. All files served from Firebase Storage under admin-only rules.
        </p>
      </header>

      {success && <div style={{ padding: '0.7rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>}
      {error && <div style={{ padding: '0.7rem 1rem', background: '#fef2f2', color: '#991b1b', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {fetchState === 'loading' && <div style={{ color: '#71717a' }}>Loading weeks…</div>}
      {fetchState === 'error' && <div style={{ color: '#991b1b' }}>Failed to load weekly content.</div>}

      {fetchState === 'idle' && weeks.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
          <p>No weeks yet. Click "+ New week" to add one.</p>
        </div>
      )}

      {weeks.length > 0 && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem' }}>Week</th>
                <th style={{ padding: '0.6rem' }}>Title</th>
                <th style={{ padding: '0.6rem' }}>Release</th>
                <th style={{ padding: '0.6rem' }}>Role</th>
                <th style={{ padding: '0.6rem' }}>Published</th>
                <th style={{ padding: '0.6rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.weekNumber} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.6rem' }}>{w.weekNumber}</td>
                  <td style={{ padding: '0.6rem' }}>{w.title || <em>(untitled)</em>}</td>
                  <td style={{ padding: '0.6rem' }}>{w.releaseDate}</td>
                  <td style={{ padding: '0.6rem' }}>{w.requiredRole}</td>
                  <td style={{ padding: '0.6rem' }}>{w.published ? '✓' : '—'}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <div className="wk-actions">
                      <button type="button" className="wk-act wk-act-primary" onClick={() => setEditingContentWeek({ ...w })}>
                        <i className="fas fa-pen" aria-hidden="true" /> Edit content
                      </button>
                      <button type="button" className="wk-act" onClick={() => setEditing({ ...w })}>
                        <i className="fas fa-gear" aria-hidden="true" /> Settings
                      </button>
                      <Link to={`/weekly/${w.weekNumber}`} className="wk-act">
                        <i className="fas fa-eye" aria-hidden="true" /> View
                      </Link>
                      <button type="button" className="wk-act wk-act-danger" onClick={() => handleDelete(w)}>
                        <i className="fas fa-trash" aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <WeeklyEditorModal
          value={editing}
          setValue={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {editingContentWeek && (
        <LessonContentEditor
          week={editingContentWeek}
          onClose={() => setEditingContentWeek(null)}
          onSaved={() => { refresh(); }}
        />
      )}
    </div>
  );
};

interface EditorProps {
  value: WeeklyContent;
  setValue: (v: WeeklyContent) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const WeeklyEditorModal: React.FC<EditorProps> = ({ value, setValue, onSave, onCancel, saving }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Week {value.weekNumber} {value.id ? '— edit' : '— new'}</h2>
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <label>
            <strong>Week number (1–52):</strong>
            <input type="number" min={1} max={52} value={value.weekNumber} onChange={(e) => setValue({ ...value, weekNumber: parseInt(e.target.value || '1', 10) })} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4, borderRadius: 6, border: '1px solid #d1d5db' }} />
          </label>
          <label>
            <strong>Title:</strong>
            <input type="text" value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4, borderRadius: 6, border: '1px solid #d1d5db' }} />
          </label>
          <label>
            <strong>Release date (YYYY-MM-DD):</strong>
            <input type="date" value={value.releaseDate} onChange={(e) => setValue({ ...value, releaseDate: e.target.value })} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4, borderRadius: 6, border: '1px solid #d1d5db' }} />
          </label>
          <label>
            <strong>Required role:</strong>
            <select value={value.requiredRole} onChange={(e) => setValue({ ...value, requiredRole: e.target.value as RequiredRole })} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: 4, borderRadius: 6, border: '1px solid #d1d5db' }}>
              <option value="admin">admin — admins only</option>
              <option value="student">student — paying students + admins</option>
              <option value="public">public — anyone who's logged in</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={value.published} onChange={(e) => setValue({ ...value, published: e.target.checked })} />
            <span><strong>Published</strong> (if off, hidden from non-admins regardless of release date)</span>
          </label>

          <fieldset style={{ border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: 8 }}>
            <legend><strong>HTML file</strong></legend>
            {value.htmlStoragePath ? (
              <div style={{ fontSize: '0.85rem', color: '#065f46' }}>✓ {value.htmlStoragePath}</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>(no HTML uploaded yet)</div>
            )}
          </fieldset>

          <fieldset style={{ border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: 8 }}>
            <legend><strong>Audio files ({value.audioStoragePaths.length})</strong></legend>
            {value.audioStoragePaths.length > 0 ? (
              <ul style={{ fontSize: '0.85rem', margin: 0, padding: 0, listStyle: 'none' }}>
                {value.audioStoragePaths.map((p) => (
                  <li key={p} style={{ padding: '0.25rem 0' }}>{p}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>(none registered yet)</div>
            )}
          </fieldset>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={onSave} disabled={saving || !value.title || !value.htmlStoragePath}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAdminView;
