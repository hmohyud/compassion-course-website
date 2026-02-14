import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { createBoard, listBoardsForUser, listBoardsForTeam, deleteBoard } from '../../services/whiteboards/whiteboardService';
import { getMemberHubConfig } from '../../services/memberHubService';
import type { BoardDoc } from '../../services/whiteboards/whiteboardTypes';

const DEFAULT_COMPANY_ID = 'default';

const cardStyle: React.CSSProperties = {
  padding: '30px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  textDecoration: 'none',
  color: '#111827',
  display: 'block',
  border: '2px solid transparent',
  transition: 'all 0.2s',
};

const WhiteboardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId') ?? undefined;
  const companyId = searchParams.get('companyId') ?? DEFAULT_COMPANY_ID;
  const [boards, setBoards] = useState<BoardDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [externalWhiteboardUrl, setExternalWhiteboardUrl] = useState<string | null>(null);
  const [externalWhiteboardEmbedUrl, setExternalWhiteboardEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = teamId
          ? await listBoardsForTeam(teamId, companyId)
          : await listBoardsForUser(user.uid);
        if (!cancelled) setBoards(list);
      } catch (e) {
        if (!cancelled) console.error('Failed to list whiteboards', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, teamId, companyId]);

  useEffect(() => {
    let cancelled = false;
    getMemberHubConfig()
      .then((config) => {
        if (!cancelled && config) {
          if (config.externalWhiteboardUrl) setExternalWhiteboardUrl(config.externalWhiteboardUrl);
          if (config.externalWhiteboardEmbedUrl) setExternalWhiteboardEmbedUrl(config.externalWhiteboardEmbedUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!user?.uid) return;
    setCreating(true);
    try {
      const { boardId } = await createBoard({
        ownerId: user.uid,
        title: 'Untitled whiteboard',
        ...(teamId ? { teamId, teamCompanyId: companyId } : {}),
      });
      const backQuery = teamId ? `?teamId=${teamId}&companyId=${companyId}` : '';
      navigate(`/platform/whiteboards/${boardId}${backQuery}`);
    } catch (e) {
      console.error('Create whiteboard failed', e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, board: BoardDoc) => {
    e.preventDefault();
    e.stopPropagation();
    if (board.ownerId !== user?.uid) return;
    if (!window.confirm(`Delete "${board.title}"?`)) return;
    setDeletingId(board.id);
    try {
      await deleteBoard(board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: Date) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const backLink = teamId
    ? `/portal/leadership/teams/${teamId}`
    : '/platform/whiteboards';
  const backLabel = teamId ? 'Back to team' : 'Back';

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Link to={backLink} style={{ color: '#002B4D', textDecoration: 'none', fontSize: '0.95rem' }}>
            {backLabel}
          </Link>
          <h1 style={{ color: '#002B4D', margin: 0 }}>Whiteboards</h1>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              ...cardStyle,
              padding: '12px 24px',
              maxWidth: 'fit-content',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              border: '2px solid #002B4D',
            }}
          >
            {creating ? 'Creating…' : 'New whiteboard'}
          </button>
        </div>

        <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '24px' }}>
          Create and edit whiteboards. Draw and add shapes; changes are saved automatically.
        </p>

        {externalWhiteboardUrl && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 20px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
            }}
          >
            <a
              href={externalWhiteboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#002B4D', fontWeight: 600, textDecoration: 'none' }}
            >
              Open shared whiteboard →
            </a>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0 0 0' }}>
              Opens in a new tab (e.g. Miro, FigJam).
            </p>
          </div>
        )}

        {externalWhiteboardEmbedUrl && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1.25rem' }}>Shared whiteboard</h2>
            <iframe
              src={externalWhiteboardEmbedUrl}
              title="Shared whiteboard"
              style={{ width: '100%', height: '500px', border: '1px solid #e5e7eb', borderRadius: '12px' }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        )}

        <h2 style={{ color: '#002B4D', marginBottom: '16px', fontSize: '1.25rem' }}>In-app whiteboards</h2>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading whiteboards…</p>
        ) : boards.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>No whiteboards yet.</p>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              style={{
                color: '#002B4D',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
              }}
            >
              Create your first whiteboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {boards.map((board) => {
              const href = `/platform/whiteboards/${board.id}${teamId ? `?teamId=${teamId}&companyId=${companyId}` : ''}`;
              return (
                <div key={board.id} style={{ ...cardStyle, position: 'relative' }}>
                  <Link
                    to={href}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget.closest('div');
                      if (target) {
                        target.style.borderColor = '#002B4D';
                        target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const target = e.currentTarget.closest('div');
                      if (target) {
                        target.style.borderColor = 'transparent';
                        target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <h2 style={{ color: '#002B4D', marginBottom: '8px', fontSize: '1.1rem' }}>{board.title}</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Updated {formatDate(board.updatedAt)}</p>
                  </Link>
                  {board.ownerId === user?.uid && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, board)}
                      disabled={deletingId === board.id}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '14px',
                      }}
                      title="Delete whiteboard"
                    >
                      {deletingId === board.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WhiteboardsPage;
