import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { listWhiteboards, createWhiteboard } from '../services/whiteboardService';
import type { WhiteboardMeta } from '../services/whiteboardService';

const WhiteboardsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [boards, setBoards] = useState<WhiteboardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWhiteboards()
      .then((list) => {
        if (!cancelled) setBoards(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load whiteboards');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!isAdmin || !user?.uid) return;
    setError(null);
    setCreating(true);
    try {
      const boardId = await createWhiteboard('Untitled whiteboard', user.uid);
      navigate(`/whiteboards/${boardId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create whiteboard');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  };

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ color: '#002B4D', marginBottom: '8px' }}>Whiteboards</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          View and edit shared whiteboards. Only admins can create or edit.
        </p>

        {isAdmin && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !user}
            style={{
              padding: '10px 20px',
              background: '#002B4D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: user && !creating ? 'pointer' : 'not-allowed',
              marginBottom: '24px',
            }}
          >
            {creating ? 'Creating…' : 'New Whiteboard'}
          </button>
        )}

        {error && (
          <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</div>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : boards.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No whiteboards yet.</p>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#002B4D' }}>{board.title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Updated {formatDate(board.updatedAt)}
                  </div>
                </div>
                <Link
                  to={`/whiteboards/${board.id}`}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default WhiteboardsListPage;
