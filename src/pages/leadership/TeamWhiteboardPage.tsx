import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getTeamWhiteboard,
  updateTeamWhiteboard,
} from '../../services/leadershipTeamWhiteboardsService';
import type { LeadershipTeamWhiteboard } from '../../types/leadership';
import { Tldraw, getSnapshot, loadSnapshot, createTLStore } from 'tldraw';
import 'tldraw/tldraw.css';

type StoreWithStatus =
  | { status: 'loading' }
  | { status: 'ready'; store: ReturnType<typeof createTLStore> }
  | { status: 'error'; message: string };

const TeamWhiteboardPage: React.FC = () => {
  const { teamId, whiteboardId } = useParams<{ teamId: string; whiteboardId: string }>();
  const [whiteboard, setWhiteboard] = useState<LeadershipTeamWhiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeWithStatus, setStoreWithStatus] = useState<StoreWithStatus>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<{ store: ReturnType<typeof createTLStore> } | null>(null);

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

  useEffect(() => {
    if (!whiteboardId || !teamId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const wb = await getTeamWhiteboard(whiteboardId);
        if (cancelled) return;
        if (!wb || wb.teamId !== teamId) {
          setStoreWithStatus({ status: 'error', message: 'Whiteboard not found' });
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
          console.error('Load team whiteboard failed', e);
          setStoreWithStatus({ status: 'error', message: 'Failed to load' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whiteboardId, teamId]);

  const handleSave = useCallback(async () => {
    if (!whiteboard || !whiteboardId) return;
    const editor = editorRef.current;
    if (!editor?.store) return;
    setSaving(true);
    try {
      const { document: doc } = getSnapshot(editor.store);
      await updateTeamWhiteboard(whiteboardId, {
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
  }, [whiteboard, whiteboardId, title]);

  if (!teamId || !whiteboardId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>← Back</Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Invalid whiteboard.</p>
        </div>
      </Layout>
    );
  }

  if (loading || storeWithStatus.status === 'loading') {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
          Loading whiteboard…
        </div>
      </Layout>
    );
  }

  if (storeWithStatus.status === 'error') {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>Unable to load whiteboard</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{storeWithStatus.message}</p>
          <Link
            to={`/portal/leadership/teams/${teamId}/whiteboards`}
            style={{ color: '#002B4D', fontWeight: 600 }}
          >
            Back to team whiteboards
          </Link>
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
          <Link
            to={`/portal/leadership/teams/${teamId}/whiteboards`}
            style={{
              padding: '8px 16px',
              color: '#6b7280',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Back
          </Link>
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
    </Layout>
  );
};

export default TeamWhiteboardPage;
