import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  listWhiteboardsForUser,
  deleteWhiteboard,
} from '../../services/whiteboardService';
import { Whiteboard } from '../../types/platform';

const cardStyle = {
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
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await listWhiteboardsForUser(
          user.uid,
          user.email ?? null
        );
        if (!cancelled) setWhiteboards(list);
      } catch (e) {
        if (!cancelled) console.error('Failed to list whiteboards', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email]);

  const handleDelete = async (e: React.MouseEvent, wb: Whiteboard) => {
    e.preventDefault();
    e.stopPropagation();
    if (wb.ownerId !== user?.uid) return;
    if (!window.confirm(`Delete "${wb.title}"?`)) return;
    setDeletingId(wb.id);
    try {
      await deleteWhiteboard(wb.id, user!.uid);
      setWhiteboards((prev) => prev.filter((w) => w.id !== wb.id));
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
          <h1 style={{ color: '#002B4D', margin: 0 }}>Whiteboards</h1>
          <Link
            to="/platform/whiteboards/new"
            style={{
              ...cardStyle,
              padding: '12px 24px',
              maxWidth: 'fit-content',
              fontWeight: 600,
            }}
          >
            New whiteboard
          </Link>
        </div>

        <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '24px' }}>
          Create and share whiteboards. Draw lines and add sticky notes; share
          access by email.
        </p>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading whiteboards…</p>
        ) : whiteboards.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: 'center',
              padding: '48px 24px',
            }}
          >
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              No whiteboards yet.
            </p>
            <Link
              to="/platform/whiteboards/new"
              style={{
                color: '#002B4D',
                fontWeight: 600,
              }}
            >
              Create your first whiteboard
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {whiteboards.map((wb) => (
              <div
                key={wb.id}
                style={{
                  ...cardStyle,
                  position: 'relative',
                }}
              >
                <Link
                  to={`/platform/whiteboards/${wb.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                  }}
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <h2
                      style={{
                        color: '#002B4D',
                        marginBottom: '8px',
                        fontSize: '1.1rem',
                        flex: 1,
                      }}
                    >
                      {wb.title}
                    </h2>
                    {wb.ownerId !== user?.uid && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Shared
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                    Updated {formatDate(wb.updatedAt)}
                  </p>
                </Link>
                {wb.ownerId === user?.uid && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, wb)}
                    disabled={deletingId === wb.id}
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
                    {deletingId === wb.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WhiteboardsPage;
