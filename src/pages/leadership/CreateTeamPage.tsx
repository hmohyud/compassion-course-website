import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createTeam } from '../../services/leadershipTeamsService';
import { createBoardForTeam } from '../../services/leadershipBoardsService';
import { listUserProfiles } from '../../services/userProfileService';
import type { UserProfile } from '../../types/platform';

const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUserProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Team name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const team = await createTeam(trimmed, Array.from(selectedIds));
      await createBoardForTeam(team.id);
      navigate(`/portal/leadership/teams/${team.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team.');
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to="/portal/leadership"
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to Leadership Portal
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>Create team</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '24px' }}>
          Create a new team and its board. You can add members now or later.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="team-name" style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Team name
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Team"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Members (optional)
            </label>
            {loading ? (
              <p style={{ color: '#6b7280' }}>Loading users…</p>
            ) : profiles.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No user profiles found.</p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                {profiles.map((p) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleMember(p.id)}
                    />
                    <span style={{ color: '#111827' }}>{p.name || p.email || p.id}</span>
                    {p.email && (
                      <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>({p.email})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                background: '#002B4D',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Creating…' : 'Create team'}
            </button>
            <Link
              to="/portal/leadership"
              style={{
                padding: '10px 20px',
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateTeamPage;
