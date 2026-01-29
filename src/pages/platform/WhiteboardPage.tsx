import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  getWhiteboard,
  createWhiteboard,
  updateWhiteboard,
  addShareByEmail,
  removeShareByEmail,
} from '../../services/whiteboardService';
import { Whiteboard as WhiteboardType } from '../../types/platform';
import { Tldraw, getSnapshot, loadSnapshot, createTLStore } from 'tldraw';
import 'tldraw/tldraw.css';

type StoreWithStatus =
  | { status: 'loading' }
  | { status: 'ready'; store: ReturnType<typeof createTLStore> }
  | { status: 'error'; message: string };

const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [whiteboard, setWhiteboard] = useState<WhiteboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [storeWithStatus, setStoreWithStatus] = useState<StoreWithStatus>({
    status: 'loading',
  });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareError, setShareError] = useState('');
  const editorRef = useRef<{ store: ReturnType<typeof createTLStore> } | null>(
    null
  );

  const tldrawOverrides = useMemo(
    () => ({
      actions(editor: unknown, actions: Record<string, { kbd?: string } & unknown>) {
        const focusAction = actions['toggle-focus-mode'];
        if (focusAction && 'kbd' in focusAction) {
          return { ...actions, 'toggle-focus-mode': { ...focusAction, kbd: undefined } };
        }
        return actions;
      },
    }),
    []
  );

  const hasAccess = useCallback(
    (wb: WhiteboardType) => {
      if (!user) return false;
      if (wb.ownerId === user.uid) return true;
      if (user.email && wb.sharedWith.includes(user.email.toLowerCase()))
        return true;
      return false;
    },
    [user]
  );

  const isOwner = whiteboard && user && whiteboard.ownerId === user.uid;

  useEffect(() => {
    if (!id || !user?.uid) return;

    if (id === 'new') {
      (async () => {
        try {
          const wb = await createWhiteboard(user.uid, 'Untitled whiteboard');
          navigate(`/platform/whiteboards/${wb.id}`, { replace: true });
        } catch (e) {
          console.error('Create whiteboard failed', e);
          setStoreWithStatus({ status: 'error', message: 'Failed to create' });
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const wb = await getWhiteboard(id);
        if (cancelled) return;
        if (!wb) {
          setNoAccess(true);
          setLoading(false);
          return;
        }
        if (!hasAccess(wb)) {
          setNoAccess(true);
          setWhiteboard(wb);
          setLoading(false);
          return;
        }
        setWhiteboard(wb);
        setTitle(wb.title);

        const store = createTLStore();
        const docSnapshot = wb.snapshot && Object.keys(wb.snapshot).length > 0
          ? wb.snapshot
          : undefined;
        if (docSnapshot) {
          try {
            loadSnapshot(store, { document: docSnapshot as Record<string, unknown> });
          } catch (e) {
            console.warn('Load snapshot failed, using empty', e);
          }
        }
        if (!cancelled) {
          setStoreWithStatus({ status: 'ready', store });
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Load whiteboard failed', e);
          setStoreWithStatus({ status: 'error', message: 'Failed to load' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user?.uid, user?.email, navigate, hasAccess]);

  const handleSave = useCallback(async () => {
    if (!whiteboard || !id || id === 'new') return;
    const editor = editorRef.current;
    if (!editor?.store) return;
    setSaving(true);
    try {
      const { document: doc } = getSnapshot(editor.store);
      await updateWhiteboard(id, {
        snapshot: doc as Record<string, unknown>,
        title: title.trim() || whiteboard.title,
      });
      setWhiteboard((prev) =>
        prev
          ? {
              ...prev,
              title: title.trim() || prev.title,
              snapshot: doc as Record<string, unknown>,
              updatedAt: new Date(),
            }
          : null
      );
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  }, [whiteboard, id, title]);

  const handleShareAdd = useCallback(async () => {
    if (!whiteboard || !user?.uid || whiteboard.ownerId !== user.uid) return;
    const email = shareEmail.trim().toLowerCase();
    if (!email) {
      setShareError('Enter an email address');
      return;
    }
    setShareError('');
    try {
      await addShareByEmail(whiteboard.id, user.uid, email);
      setWhiteboard((prev) =>
        prev
          ? {
              ...prev,
              sharedWith: [...prev.sharedWith, email].filter(
                (e, i, a) => a.indexOf(e) === i
              ),
            }
          : null
      );
      setShareEmail('');
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Failed to add');
    }
  }, [whiteboard, user?.uid, shareEmail]);

  const handleShareRemove = useCallback(
    async (email: string) => {
      if (!whiteboard || !user?.uid || whiteboard.ownerId !== user.uid) return;
      try {
        await removeShareByEmail(whiteboard.id, user.uid, email);
        setWhiteboard((prev) =>
          prev
            ? { ...prev, sharedWith: prev.sharedWith.filter((e) => e !== email) }
            : null
        );
      } catch (e) {
        console.error('Remove share failed', e);
      }
    },
    [whiteboard, user?.uid]
  );

  if (loading || (id === 'new' && !whiteboard)) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
          Loading…
        </div>
      </Layout>
    );
  }

  if (noAccess || storeWithStatus.status === 'error') {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>
            You don&apos;t have access to this whiteboard
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {storeWithStatus.status === 'error'
              ? storeWithStatus.message
              : 'Request access from the owner or check the link.'}
          </p>
          <a href="/platform/whiteboards" style={{ color: '#002B4D', fontWeight: 600 }}>
            Back to Whiteboards
          </a>
        </div>
      </Layout>
    );
  }

  if (storeWithStatus.status !== 'ready') {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
          Loading whiteboard…
        </div>
      </Layout>
    );
  }

  const { store } = storeWithStatus;

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 400 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Whiteboard title"
            style={{
              flex: '1',
              minWidth: 120,
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#111827',
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              background: '#002B4D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              style={{
                padding: '8px 16px',
                background: '#fff',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Share
            </button>
          )}
          <a
            href="/platform/whiteboards"
            style={{
              padding: '8px 16px',
              color: '#6b7280',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Back
          </a>
        </div>

        <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
          <Tldraw
            store={store}
            overrides={tldrawOverrides}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateInstanceState({ isFocusMode: false });
            }}
          />
        </div>
      </div>

      {shareOpen && isOwner && whiteboard && (
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
          onClick={() => setShareOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#002B4D', marginBottom: '16px' }}>
              Share by email
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="email@example.com"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <button
                type="button"
                onClick={handleShareAdd}
                style={{
                  padding: '8px 16px',
                  background: '#002B4D',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>
            {shareError && (
              <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>
                {shareError}
              </p>
            )}
            {whiteboard.sharedWith.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                  People with access:
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {whiteboard.sharedWith.map((email) => (
                    <li
                      key={email}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleShareRemove(email)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              style={{
                padding: '8px 16px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WhiteboardPage;
