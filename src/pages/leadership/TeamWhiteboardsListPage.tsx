import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  listWhiteboards,
  createWhiteboard,
  deleteWhiteboard,
  DEFAULT_COMPANY_ID,
} from '../../services/whiteboardService';
import { getTeam } from '../../services/leadershipTeamsService';
import { useAuth } from '../../context/AuthContext';
import type { Whiteboard } from '../../types/whiteboard';

const TeamWhiteboardsListPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      listWhiteboards(DEFAULT_COMPANY_ID, teamId),
      getTeam(teamId),
    ])
      .then(([list, team]) => {
        setWhiteboards(list);
        setTeamName(team?.name ?? '');
      })
      .catch(() => {
        setWhiteboards([]);
        setTeamName('');
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCreate = async () => {
    if (!teamId || !user?.uid) return;
    setCreating(true);
    try {
      const wb = await createWhiteboard(DEFAULT_COMPANY_ID, user.uid, {
        teamId,
        title: 'Untitled whiteboard',
      });
      navigate(`/portal/leadership/teams/${teamId}/whiteboards/${wb.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (wb: Whiteboard) => {
    if (!window.confirm(`Delete "${wb.title}"?`)) return;
    setDeletingId(wb.id);
    try {
      await deleteWhiteboard(DEFAULT_COMPANY_ID, wb.id);
      setWhiteboards((prev) => prev.filter((w) => w.id !== wb.id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  if (!teamId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>← Back</Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <Link
          to={`/portal/leadership/teams/${teamId}`}
          style={{ color: '#002B4D', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
        >
          ← Back to team
        </Link>
        <h1 style={{ color: '#002B4D', marginBottom: '10px' }}>
          {teamName ? `${teamName} – Whiteboards` : 'Team whiteboards'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '24px' }}>
          Create and open team whiteboards. All team members can edit.
        </p>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!user?.uid || creating}
          style={{
            padding: '10px 20px',
            background: '#002B4D',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: user?.uid && !creating ? 'pointer' : 'not-allowed',
            marginBottom: '24px',
          }}
        >
          {creating ? 'Creating…' : 'New whiteboard'}
        </button>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : whiteboards.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No whiteboards yet. Create one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {whiteboards.map((wb) => (
              <li
                key={wb.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <Link
                  to={`/portal/leadership/teams/${teamId}/whiteboards/${wb.id}`}
                  style={{ color: '#002B4D', fontWeight: 600, textDecoration: 'none', flex: 1, minWidth: 0 }}
                >
                  {wb.title}
                </Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    to={`/portal/leadership/teams/${teamId}/whiteboards/${wb.id}`}
                    style={{
                      padding: '6px 12px',
                      background: '#002B4D',
                      color: '#fff',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                    }}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(wb)}
                    disabled={deletingId === wb.id}
                    style={{
                      padding: '6px 12px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deletingId === wb.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {deletingId === wb.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default TeamWhiteboardsListPage;
