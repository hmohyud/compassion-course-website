import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  listBoardsForTeam,
  createBoard,
  deleteBoard,
} from '../../services/whiteboards/whiteboardService';
import { messageFromCaught } from '../../services/whiteboards/whiteboardErrors';
import { getTeam } from '../../services/leadershipTeamsService';
import { useAuth } from '../../context/AuthContext';
import type { BoardDoc } from '../../services/whiteboards/whiteboardTypes';

const DEFAULT_COMPANY_ID = 'default';

const TeamWhiteboardsListPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [boards, setBoards] = useState<BoardDoc[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([listBoardsForTeam(teamId, DEFAULT_COMPANY_ID), getTeam(teamId)])
      .then(([list, team]) => {
        setBoards(list);
        setTeamName(team?.name ?? '');
      })
      .catch(() => {
        setBoards([]);
        setTeamName('');
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCreate = async () => {
    if (!teamId || !user?.uid) return;
    setCreateError(null);
    setCreating(true);
    try {
      const { boardId } = await createBoard({
        ownerId: user.uid,
        title: 'Untitled whiteboard',
        teamId,
        teamCompanyId: DEFAULT_COMPANY_ID,
      });
      navigate(`/platform/whiteboards/${boardId}?teamId=${teamId}&companyId=${DEFAULT_COMPANY_ID}`);
    } catch (e) {
      const msg = messageFromCaught(e);
      setCreateError(msg);
      console.error('Create whiteboard failed:', msg, e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (board: BoardDoc) => {
    if (!window.confirm(`Delete "${board.title}"?`)) return;
    setDeletingId(board.id);
    try {
      await deleteBoard(board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
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

        {createError && (
          <p style={{ color: '#dc2626', marginBottom: '16px' }}>{createError}</p>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : boards.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No whiteboards yet. Create one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {boards.map((board) => (
              <li
                key={board.id}
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
                  to={`/platform/whiteboards/${board.id}?teamId=${teamId}&companyId=${DEFAULT_COMPANY_ID}`}
                  style={{ color: '#002B4D', fontWeight: 600, textDecoration: 'none', flex: 1, minWidth: 0 }}
                >
                  {board.title}
                </Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    to={`/platform/whiteboards/${board.id}?teamId=${teamId}&companyId=${DEFAULT_COMPANY_ID}`}
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
                    onClick={() => handleDelete(board)}
                    disabled={deletingId === board.id}
                    style={{
                      padding: '6px 12px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deletingId === board.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {deletingId === board.id ? 'Deleting…' : 'Delete'}
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
