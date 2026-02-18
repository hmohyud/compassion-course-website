// Deprecated: user provisioning is self-signup only. Create User tab removed.
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../context/AuthContext';
import { listUserProfiles, getUserProfile, createUserProfile, updateUserProfile, deleteUserProfile } from '../../services/userProfileService';
import { listUsersByStatus, type UserDoc } from '../../services/usersService';
import { listTeams, getTeam, createTeamWithBoard, updateTeam, deleteTeam } from '../../services/leadershipTeamsService';
import { UserProfile, PortalRole } from '../../types/platform';
import type { LeadershipTeam } from '../../types/leadership';
import AdminLayout from '../../components/AdminLayout';

const GOOGLE_ADMIN_CONSOLE_URL = 'https://admin.google.com';

const APPROVE_ROLES: PortalRole[] = ['viewer', 'contributor', 'manager', 'admin'];

export type AdminUserTab = 'directory' | 'teams' | 'pending';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: AdminUserTab =
    tabParam === 'teams' || tabParam === 'pending' ? tabParam : 'directory';
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
  const [roleFilter, setRoleFilter] = useState<'all' | PortalRole>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Redirect legacy ?tab=create to directory
  useEffect(() => {
    if (searchParams.get('tab') === 'create') {
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Team Management tab state
  const [teams, setTeams] = useState<LeadershipTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [editingTeam, setEditingTeam] = useState<LeadershipTeam | null>(null);
  const [createTeamName, setCreateTeamName] = useState('');
  const [teamSaving, setTeamSaving] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);
  const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamMemberIds, setEditTeamMemberIds] = useState<Set<string>>(new Set());

  const [pendingUsers, setPendingUsers] = useState<UserDoc[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [openingEditPendingUid, setOpeningEditPendingUid] = useState<string | null>(null);

  const setTab = (t: AdminUserTab) => setSearchParams(t === 'directory' ? {} : { tab: t });

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadTeams = async () => {
    setTeamsLoading(true);
    try {
      const list = await listTeams();
      setTeams(list);
      const profiles = await listUserProfiles();
      setTeamProfiles(profiles);
    } catch (err) {
      console.error('Error loading teams:', err);
      setTeams([]);
      setTeamProfiles([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'teams') loadTeams();
  }, [activeTab]);

  const loadPendingUsers = async () => {
    setPendingLoading(true);
    try {
      const list = await listUsersByStatus('pending');
      setPendingUsers(list);
    } catch (e) {
      console.error('Load pending users failed:', e);
      setPendingUsers([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') loadPendingUsers();
  }, [activeTab]);

  const openEditForPendingUser = async (u: UserDoc) => {
    setOpeningEditPendingUid(u.uid);
    setError('');
    try {
      let profile = await getUserProfile(u.uid);
      if (!profile) {
        profile = await createUserProfile(u.uid, u.email, u.displayName || '');
      }
      setEditingProfile(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open edit';
      setError(message);
    } finally {
      setOpeningEditPendingUid(null);
    }
  };

  const approveUser = async (uid: string, role: PortalRole) => {
    const approveUserFn = httpsCallable<{ uid: string; role: string }, { ok: boolean; uid: string; status: string; role: string }>(
      functions,
      'approveUser'
    );
    setApprovingUid(uid);
    setError('');
    setSuccess('');
    try {
      await approveUserFn({ uid, role });
      setSuccess(`User approved with role ${role}.`);
      await loadPendingUsers();
      await loadData();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const message = (err as { message?: string })?.message ?? 'Failed to approve.';
      if (code === 'functions/permission-denied') setError('Only admins can approve users.');
      else if (code === 'functions/not-found') setError('User not found.');
      else setError(message);
    } finally {
      setApprovingUid(null);
    }
  };


  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const profileList = await listUserProfiles();
      setProfiles(profileList);
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        const ids = new Set<string>();
        adminsSnap.docs.forEach((d) => {
          ids.add(d.id);
          const email = d.data()?.email;
          if (email) ids.add(email.toLowerCase());
        });
        setAdminIds(ids);
      } catch (err) {
        console.error('Error loading admin IDs:', err);
        setAdminIds(new Set());
      }
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
      const role = profile.role ?? 'viewer';
      if (role !== roleFilter) return false;
    }
    return true;
  });

  const removeFromDirectory = async (profile: UserProfile, onSuccess?: () => void) => {
    if (!window.confirm(`Remove ${profile.email || profile.id} from the directory? This deletes their profile; they will no longer appear in the list.`)) return;
    setError('');
    setSuccess('');
    setRemovingId(profile.id);
    try {
      await deleteUserProfile(profile.id);
      setSuccess('User removed from directory.');
      await loadData();
      loadPendingUsers();
      onSuccess?.();
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

  const setRole = async (userId: string, role: PortalRole) => {
    setError('');
    setSuccess('');
    setUpdatingId(userId);
    try {
      await updateUserProfile(userId, { role });
      setSuccess(`Role updated to ${role}.`);
      await loadData();
      loadPendingUsers();
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
    const profile = profiles.find((p) => p.email?.toLowerCase() === normalizedEmail);
    const targetUid = profile?.id;
    if (!targetUid) {
      setError('No user with this email in the directory. They must register or be created first.');
      setGranting(false);
      return;
    }
    if (adminIds.has(targetUid)) {
      setError('This user already has admin rights');
      setGranting(false);
      return;
    }
    try {
      const grantAdminCallable = httpsCallable<{ targetUid: string; email: string }, { ok: boolean }>(
        functions,
        'grantAdmin'
      );
      await grantAdminCallable({ targetUid, email: normalizedEmail });
      setSuccess(`Admin rights granted to ${normalizedEmail}. They will have admin access when they log in.`);
      setGrantEmail('');
      setAdminIds((prev) => new Set([...prev, targetUid, normalizedEmail]));
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grant admin rights';
      setError(message);
    } finally {
      setGranting(false);
    }
  };

  const revokeAdmin = async (profile: UserProfile, onSuccess?: () => void) => {
    const email = profile.email?.toLowerCase().trim();
    if (!email) return;
    if (!window.confirm(`Are you sure you want to revoke admin rights from ${profile.email}?`)) return;
    setError('');
    setSuccess('');
    setRevokingId(profile.id);
    try {
      const revokeAdminCallable = httpsCallable<{ targetUid: string }, { ok: boolean }>(
        functions,
        'revokeAdmin'
      );
      await revokeAdminCallable({ targetUid: profile.id });
      setSuccess(`Admin rights revoked from ${profile.email}`);
      setAdminIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        if (email) next.delete(email);
        return next;
      });
      await loadData();
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke admin rights';
      setError(message);
    } finally {
      setRevokingId(null);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createTeamName.trim();
    if (!name) return;
    setCreateTeamError(null);
    setTeamSaving(true);
    try {
      await createTeamWithBoard(name, []);
      setCreateTeamName('');
      await loadTeams();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const message = (err as { message?: string })?.message ?? 'Failed to create team.';
      if (code === 'functions/unauthenticated') {
        setCreateTeamError('Sign in required to create teams.');
      } else if (code === 'functions/permission-denied') {
        setCreateTeamError('Only admins can create teams.');
      } else if (code === 'functions/invalid-argument') {
        setCreateTeamError(message || 'Invalid input.');
      } else {
        setCreateTeamError(message);
      }
      console.error('Create team failed:', err);
    } finally {
      setTeamSaving(false);
    }
  };

  const addMemberToTeam = async (teamId: string, userId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.includes(userId)) return;
    setUpdatingTeamId(teamId);
    try {
      await updateTeam(teamId, { memberIds: [...team.memberIds, userId] });
      await loadTeams();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const removeMemberFromTeam = async (teamId: string, userId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    setUpdatingTeamId(teamId);
    try {
      await updateTeam(teamId, { memberIds: team.memberIds.filter((id) => id !== userId) });
      await loadTeams();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const getMemberDisplayName = (profile: UserProfile) => profile.name || profile.email || profile.id;

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    const name = editTeamName.trim();
    if (!name) return;
    setTeamSaving(true);
    try {
      await updateTeam(editingTeam.id, { name, memberIds: Array.from(editTeamMemberIds) });
      setEditingTeam(null);
      await loadTeams();
    } catch (err) {
      console.error(err);
    } finally {
      setTeamSaving(false);
    }
  };

  return (
    <>
    <AdminLayout title="User Management">
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <nav style={{ display: 'flex', gap: '0' }}>
          {(['directory', 'teams', 'pending'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t ? '3px solid #002B4D' : '3px solid transparent',
                color: activeTab === t ? '#002B4D' : '#6b7280',
                fontWeight: activeTab === t ? 600 : 500,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              {t === 'directory' ? 'User Directory' : t === 'teams' ? 'Team Management' : 'Pending approvals'}
            </button>
          ))}
        </nav>
      </div>

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

        {activeTab === 'directory' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ color: '#002B4D', marginBottom: '20px' }}>User directory</h2>
          <p style={{ marginBottom: '20px', color: '#6b7280', fontSize: '0.9rem' }}>
            Manage user roles: Viewer, Contributor, Manager, and Admin. Only admins can change roles.
          </p>

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
                onChange={(e) => setRoleFilter(e.target.value as 'all' | PortalRole)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All roles</option>
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 1fr minmax(120px, auto) 1fr',
                  gap: '0 16px',
                  alignItems: 'center',
                  borderBottom: '2px solid #e5e7eb',
                  padding: '12px 8px',
                  color: '#002B4D',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <div><input type="checkbox" aria-label="Select all" checked={filteredProfiles.length > 0 && filteredProfiles.every((p) => selectedIds.has(p.id))} onChange={(e) => { const checked = e.target.checked; setSelectedIds(checked ? new Set(filteredProfiles.map((p) => p.id)) : new Set()); }} /></div>
                <div>Email</div>
                <div>Name</div>
                <div>Role</div>
                <div>Actions</div>
              </div>
              {filteredProfiles.map((profile) => {
                const role = profile.role ?? 'viewer';
                return (
                  <div
                    key={profile.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr 1fr minmax(120px, auto) 1fr',
                      gap: '0 16px',
                      alignItems: 'center',
                      borderBottom: '1px solid #e5e7eb',
                      padding: '12px 8px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div>
                      <input
                        type="checkbox"
                        aria-label={`Select ${profile.email}`}
                        checked={selectedIds.has(profile.id)}
                        onChange={() => toggleSelected(profile.id)}
                      />
                    </div>
                    <div style={{ color: '#111827' }}>{profile.email}</div>
                    <div style={{ color: '#374151' }}>{profile.name || '—'}</div>
                    <div>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{role}</span>
                      {isAdmin(profile) && (
                        <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#002B4D', color: '#fff', borderRadius: '6px', fontSize: '0.75rem' }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setEditingProfile(profile)}
                        style={{
                          color: '#002B4D',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {activeTab === 'pending' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>Pending approvals</h2>
          <p style={{ marginBottom: '20px', color: '#6b7280', fontSize: '0.9rem' }}>
            Users who self-registered are pending until you approve them. Assign a role and approve to grant access to the leadership portal.
          </p>
          {pendingLoading ? (
            <p style={{ color: '#6b7280' }}>Loading…</p>
          ) : pendingUsers.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No pending users.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#374151' }}>Email</th>
                    <th style={{ padding: '10px 12px', color: '#374151' }}>Name</th>
                    <th style={{ padding: '10px 12px', color: '#374151' }}>Role</th>
                    <th style={{ padding: '10px 12px', color: '#374151' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.uid} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 12px' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>{u.displayName || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          id={`role-${u.uid}`}
                          defaultValue="viewer"
                          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        >
                          {APPROVE_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={openingEditPendingUid === u.uid}
                            onClick={() => openEditForPendingUser(u)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              background: 'none',
                              color: '#002B4D',
                              border: '1px solid #002B4D',
                              borderRadius: '6px',
                              cursor: openingEditPendingUid === u.uid ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {openingEditPendingUid === u.uid ? '…' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={approvingUid === u.uid}
                            onClick={() => {
                              const sel = document.getElementById(`role-${u.uid}`) as HTMLSelectElement;
                              const role = (sel?.value ?? 'viewer') as PortalRole;
                              approveUser(u.uid, role);
                            }}
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                          >
                            {approvingUid === u.uid ? 'Approving…' : 'Approve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {activeTab === 'teams' && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
            Teams are stored in Firestore under the <strong>teams</strong> collection (at the database root). Create a team below.
          </p>
          <form onSubmit={handleCreateTeam} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={createTeamName}
              onChange={(e) => { setCreateTeamName(e.target.value); setCreateTeamError(null); }}
              placeholder="Team name"
              required
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minWidth: '200px' }}
            />
            <button
              type="submit"
              disabled={teamSaving}
              style={{
                padding: '8px 16px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: teamSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {teamSaving ? 'Creating…' : 'Create team'}
            </button>
          </form>
          {createTeamError && (
            <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '16px' }}>{createTeamError}</p>
          )}

          {teamsLoading ? (
                <p style={{ color: '#6b7280' }}>Loading teams…</p>
              ) : teams.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No teams yet. Create one to get started.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {teams.map((t) => {
                    const memberProfiles = t.memberIds
                      .map((id) => teamProfiles.find((p) => p.id === id))
                      .filter((p): p is UserProfile => p != null);
                    const availableToAdd = teamProfiles.filter((p) => !t.memberIds.includes(p.id));
                    const isUpdating = updatingTeamId === t.id;
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                          <h3 style={{ color: '#002B4D', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{t.name}</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setEditingTeam(t); setEditTeamName(t.name); setEditTeamMemberIds(new Set(t.memberIds)); }}>Edit</button>
                            <button type="button" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={async () => { if (!window.confirm(`Delete team "${t.name}"?`)) return; setTeamSaving(true); try { await deleteTeam(t.id); await loadTeams(); } catch (e) { console.error(e); } finally { setTeamSaving(false); }}} disabled={teamSaving}>Delete</button>
                          </div>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                          Members: {memberProfiles.length === 0 ? 'None' : memberProfiles.map((p) => getMemberDisplayName(p)).join(', ')}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>Add member:</span>
                          <select
                            value=""
                            onChange={(e) => {
                              const uid = e.target.value;
                              if (uid) {
                                addMemberToTeam(t.id, uid);
                                e.target.value = '';
                              }
                            }}
                            disabled={isUpdating}
                            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minWidth: '140px' }}
                          >
                            <option value="">Select user...</option>
                            {availableToAdd.map((p) => (
                              <option key={p.id} value={p.id}>{getMemberDisplayName(p)}</option>
                            ))}
                          </select>
                          {memberProfiles.map((p) => (
                            <span
                              key={p.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                background: '#f3f4f6',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                color: '#374151',
                              }}
                            >
                              {getMemberDisplayName(p)}
                              <button
                                type="button"
                                aria-label={`Remove ${getMemberDisplayName(p)}`}
                                disabled={isUpdating}
                                onClick={() => removeMemberFromTeam(t.id, p.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  marginLeft: '2px',
                                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  color: '#6b7280',
                                  fontSize: '1rem',
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
        )}

        {activeTab === 'directory' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
            Admins are shown with an Admin badge in the directory above; you can revoke admin there.
          </p>
        </div>
        )}
    </AdminLayout>

      {editingProfile && (() => {
        const isPending = pendingUsers.some((p) => p.uid === editingProfile.id);
        const closeModal = () => {
          setEditingProfile(null);
          loadPendingUsers();
        };
        return (
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
          onClick={closeModal}
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
            <h3 style={{ color: '#002B4D', marginBottom: '12px' }}>Edit user</h3>
            <p style={{ color: '#374151', marginBottom: '4px', fontSize: '14px' }}>{editingProfile.email}</p>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
              {editingProfile.name || '—'} · {(editingProfile.role ?? 'viewer')}
              {isAdmin(editingProfile) && (
                <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#002B4D', color: '#fff', borderRadius: '6px', fontSize: '0.75rem' }}>
                  Admin
                </span>
              )}
            </p>
            {isPending && (
              <p style={{ marginBottom: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
                User is pending. Use Approve in the Pending tab to activate.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Portal role</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(['viewer', 'contributor', 'manager', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={updatingId === editingProfile.id}
                    onClick={() => setRole(editingProfile.id, r)}
                    style={{
                      padding: '8px 14px',
                      background: (editingProfile.role ?? 'viewer') === r ? '#002B4D' : '#e5e7eb',
                      color: (editingProfile.role ?? 'viewer') === r ? '#fff' : '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: updatingId === editingProfile.id ? 'not-allowed' : 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {!isPending && isAdmin(editingProfile) && (
                <button
                  type="button"
                  disabled={revokingId === editingProfile.id}
                  onClick={() => revokeAdmin(editingProfile, closeModal)}
                  style={{
                    padding: '10px 16px',
                    background: revokingId === editingProfile.id ? '#9ca3af' : '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: revokingId === editingProfile.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {revokingId === editingProfile.id ? 'Revoking...' : 'Revoke admin'}
                </button>
              )}
              <button
                type="button"
                disabled={removingId === editingProfile.id}
                onClick={() => removeFromDirectory(editingProfile, closeModal)}
                style={{
                  padding: '10px 16px',
                  background: removingId === editingProfile.id ? '#9ca3af' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: removingId === editingProfile.id ? 'not-allowed' : 'pointer',
                }}
              >
                {removingId === editingProfile.id ? 'Removing...' : 'Remove from directory'}
              </button>
              {!isPending && (['manager', 'admin'] as const).includes(editingProfile.role ?? 'viewer') && editingProfile.email && (
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    openGrantWorkspaceModal(editingProfile.email!);
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#002B4D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Grant Workspace
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={closeModal}
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
        );
      })()}

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

      {editingTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingTeam(null)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: 480, width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#002B4D', marginBottom: '16px' }}>Edit team</h3>
            <form onSubmit={handleUpdateTeam}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Team name</label>
                <input type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Members</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                  {teamProfiles.map((p) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={editTeamMemberIds.has(p.id)} onChange={() => setEditTeamMemberIds((prev) => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })} />
                      <span>{p.name || p.email || p.id}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={teamSaving}>{teamSaving ? 'Saving…' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTeam(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
