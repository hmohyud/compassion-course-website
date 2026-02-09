import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { listUserProfiles, updateUserProfile, deleteUserProfile } from '../../services/userProfileService';
import { UserProfile } from '../../types/platform';

const GOOGLE_ADMIN_CONSOLE_URL = 'https://admin.google.com';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [workspaceModalEmail, setWorkspaceModalEmail] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'participant' | 'leader'>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileList, adminsSnap] = await Promise.all([
        listUserProfiles(),
        getDocs(collection(db, 'admins')),
      ]);
      setProfiles(profileList);
      const ids = new Set<string>();
      adminsSnap.docs.forEach((d) => {
        ids.add(d.id);
        const email = d.data()?.email;
        if (email) ids.add(email.toLowerCase());
      });
      setAdminIds(ids);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = (profile: UserProfile) =>
    adminIds.has(profile.id) || (profile.email && adminIds.has(profile.email.toLowerCase()));

  const filteredProfiles = profiles.filter((profile) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchEmail = profile.email?.toLowerCase().includes(q);
      const matchName = profile.name?.toLowerCase().includes(q);
      if (!matchEmail && !matchName) return false;
    }
    if (roleFilter !== 'all') {
      const role = profile.role ?? 'participant';
      if (role !== roleFilter) return false;
    }
    return true;
  });

  const removeFromDirectory = async (profile: UserProfile) => {
    if (!window.confirm(`Remove ${profile.email || profile.id} from the directory? This deletes their profile; they will no longer appear in the list.`)) return;
    setError('');
    setSuccess('');
    setRemovingId(profile.id);
    try {
      await deleteUserProfile(profile.id);
      setSuccess('User removed from directory.');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove user';
      setError(message);
    } finally {
      setRemovingId(null);
    }
  };

  const openGrantWorkspaceModal = (email: string) => {
    if (email) {
      try {
        navigator.clipboard.writeText(email);
        setSuccess('Email copied to clipboard.');
      } catch {
        setSuccess('');
      }
      setWorkspaceModalEmail(email);
    }
  };

  const setRole = async (userId: string, role: 'participant' | 'leader') => {
    setError('');
    setSuccess('');
    setUpdatingId(userId);
    try {
      await updateUserProfile(userId, { role });
      setSuccess(`Role updated to ${role}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const grantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGranting(true);
    if (!grantEmail) {
      setError('Please enter an email address');
      setGranting(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(grantEmail)) {
      setError('Please enter a valid email address');
      setGranting(false);
      return;
    }
    const normalizedEmail = grantEmail.toLowerCase().trim();
    if (adminIds.has(normalizedEmail)) {
      setError('This email already has admin rights');
      setGranting(false);
      return;
    }
    try {
      await setDoc(doc(db, 'admins', normalizedEmail), {
        email: normalizedEmail,
        role: 'admin',
        grantedBy: user?.email || 'unknown',
        grantedAt: new Date().toISOString(),
        status: 'active',
        lookupByEmail: true,
      });
      setSuccess(`Admin rights granted to ${normalizedEmail}. They will have admin access when they log in.`);
      setGrantEmail('');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grant admin rights';
      setError(message);
    } finally {
      setGranting(false);
    }
  };

  const revokeAdmin = async (profile: UserProfile) => {
    const email = profile.email?.toLowerCase().trim();
    if (!email) return;
    if (!window.confirm(`Are you sure you want to revoke admin rights from ${profile.email}?`)) return;
    setError('');
    setSuccess('');
    setRevokingId(profile.id);
    try {
      await deleteDoc(doc(db, 'admins', profile.id));
      if (profile.id !== email) {
        try {
          await deleteDoc(doc(db, 'admins', email));
        } catch {
          // Ignore if email-keyed doc doesn't exist
        }
      }
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const matching = adminsSnap.docs.filter(
        (d) => d.data()?.email?.toLowerCase() === email && d.id !== profile.id && d.id !== email
      );
      for (const d of matching) {
        try {
          await deleteDoc(doc(db, 'admins', d.id));
        } catch {
          // ignore
        }
      }
      setSuccess(`Admin rights revoked from ${profile.email}`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke admin rights';
      setError(message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>User Management</h1>
        <div className="admin-user-info">
          <button onClick={() => navigate('/admin')} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>
      <div className="admin-content">
        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
          Manage user roles: Participant and Leader. Only admins can change roles.
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#16a34a',
              marginBottom: '20px',
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>Grant Admin Rights</h2>
          <form onSubmit={grantAdmin}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="grant-email" style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                Email Address
              </label>
              <input
                type="email"
                id="grant-email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="user@example.com"
                required
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={granting}
              style={{
                padding: '10px 20px',
                background: granting ? '#9ca3af' : '#002B4D',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: granting ? 'not-allowed' : 'pointer',
              }}
            >
              {granting ? 'Granting...' : 'Grant Admin Rights'}
            </button>
          </form>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '16px', marginBottom: 0 }}>
            Admins are shown with an Admin badge in the table below; you can revoke admin there.
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>User directory</h2>

          {!loading && profiles.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minWidth: '200px',
                }}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'participant' | 'leader')}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All roles</option>
                <option value="participant">Participant</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          )}

          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading users...</p>
          ) : profiles.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No user profiles found.</p>
          ) : filteredProfiles.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No users match your search or filter.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px', color: '#002B4D' }}>Email</th>
                    <th style={{ padding: '12px 8px', color: '#002B4D' }}>Name</th>
                    <th style={{ padding: '12px 8px', color: '#002B4D' }}>Role</th>
                    <th style={{ padding: '12px 8px', color: '#002B4D' }}>Actions</th>
                    <th style={{ padding: '12px 8px', color: '#002B4D' }}>Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => {
                    const role = profile.role ?? 'participant';
                    const busy = updatingId === profile.id;
                    return (
                      <tr
                        key={profile.id}
                        style={{ borderBottom: '1px solid #e5e7eb' }}
                      >
                        <td style={{ padding: '12px 8px' }}>{profile.email}</td>
                        <td style={{ padding: '12px 8px' }}>{profile.name || '—'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{role}</span>
                          {isAdmin(profile) && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                background: '#002B4D',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {role === 'participant' ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => setRole(profile.id, 'leader')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.875rem',
                                  background: busy ? '#9ca3af' : '#002B4D',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: busy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {busy ? 'Updating...' : 'Make Leader'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={busy}
                                onClick={() => setRole(profile.id, 'participant')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.875rem',
                                  background: busy ? '#9ca3af' : '#6b7280',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: busy ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {busy ? 'Updating...' : 'Make Participant'}
                              </button>
                            )}
                            {isAdmin(profile) && (
                              <button
                                type="button"
                                disabled={revokingId === profile.id}
                                onClick={() => revokeAdmin(profile)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.875rem',
                                  background: revokingId === profile.id ? '#9ca3af' : '#dc2626',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: revokingId === profile.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {revokingId === profile.id ? 'Revoking...' : 'Revoke admin'}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={removingId === profile.id}
                              onClick={() => removeFromDirectory(profile)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.875rem',
                                background: removingId === profile.id ? '#9ca3af' : '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: removingId === profile.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {removingId === profile.id ? 'Removing...' : 'Remove from directory'}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {role === 'leader' && profile.email && (
                            <button
                              type="button"
                              onClick={() => openGrantWorkspaceModal(profile.email!)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.875rem',
                                background: '#002B4D',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Grant Workspace
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {workspaceModalEmail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setWorkspaceModalEmail(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#002B4D', marginBottom: '12px' }}>Invite to Workspace</h3>
            <p style={{ color: '#374151', marginBottom: '16px', fontSize: '14px' }}>
              Invite this user in Google Admin Console. Their email has been copied to the clipboard.
            </p>
            <p style={{ marginBottom: '16px', padding: '10px', background: '#f3f4f6', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px' }}>
              {workspaceModalEmail}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={GOOGLE_ADMIN_CONSOLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: '#002B4D',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Open Admin Console
              </a>
              <button
                type="button"
                onClick={() => setWorkspaceModalEmail(null)}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
