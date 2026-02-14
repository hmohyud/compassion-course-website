import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { getBoard, createBoard, updateBoardMeta, deleteBoard } from '../../services/whiteboards/whiteboardService';
import { loadCurrentState, saveCurrentState, resolveFileUrls } from '../../services/whiteboards/whiteboardStateService';
import { getUserRoleForBoard, isEditable } from '../../services/whiteboards/whiteboardPermissions';
import { messageFromCaught } from '../../services/whiteboards/whiteboardErrors';
import type { BoardRole } from '../../services/whiteboards/whiteboardPermissions';
import type { ExcalidrawAPI } from '../../components/whiteboard/ExcalidrawShell';
import { ExcalidrawShell } from '../../components/whiteboard/ExcalidrawShell';
import { ShareWhiteboardModal } from '../../components/whiteboard/ShareWhiteboardModal';

const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId') ?? undefined;
  const companyId = searchParams.get('companyId') ?? undefined;
  const { user } = useAuth();
  const [board, setBoard] = useState<Awaited<ReturnType<typeof getBoard>>(null);
  const [role, setRole] = useState<BoardRole>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [initialData, setInitialData] = useState<{ elements: unknown[]; appState: Record<string, unknown>; files?: Record<string, { url: string; mimeType?: string }> } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawAPI | null>(null);

  useEffect(() => {
    if (!id || !user?.uid) return;

    if (id === 'new') {
      (async () => {
        try {
          const { boardId } = await createBoard({
            ownerId: user.uid,
            title: 'Untitled whiteboard',
            ...(teamId ? { teamId, teamCompanyId: companyId ?? 'default' } : {}),
          });
          const q = teamId ? `?teamId=${teamId}&companyId=${companyId ?? 'default'}` : '';
          navigate(`/platform/whiteboards/${boardId}${q}`, { replace: true });
        } catch (e) {
          console.error('Create whiteboard failed', e);
          setError('Failed to create');
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [boardDoc, userRole, state] = await Promise.all([
          getBoard(id),
          getUserRoleForBoard(id, user.uid),
          loadCurrentState(id),
        ]);
        if (cancelled) return;
        if (!boardDoc) {
          setError('Whiteboard not found');
          setLoading(false);
          return;
        }
        if (userRole === 'none') {
          setError('You do not have access to this whiteboard');
          setLoading(false);
          return;
        }
        setBoard(boardDoc);
        setRole(userRole);
        setTitle(boardDoc.title);
        const elements = state?.elements ?? [];
        const appState = state?.appState ?? {};
        let files: Record<string, { url: string; mimeType?: string }> | undefined;
        if (state?.filesMeta && Object.keys(state.filesMeta).length > 0) {
          files = await resolveFileUrls(id, state.filesMeta);
        }
        setInitialData({ elements, appState, files });
        await updateBoardMeta(id, { lastOpenedAt: new Date() });
      } catch (e) {
        if (!cancelled) {
          console.error('Load whiteboard failed', e);
          setError(messageFromCaught(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.uid, navigate, teamId, companyId]);

  const persistState = useCallback(async () => {
    if (!board || !id || id === 'new' || !user?.uid) return;
    const api = excalidrawApiRef.current;
    if (!api) return;
    setSaveStatus('saving');
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const filesRaw = api.getFiles();
      const files: Record<string, { dataUrl?: string; mimeType?: string }> = {};
      if (filesRaw && typeof filesRaw === 'object' && !Array.isArray(filesRaw)) {
        for (const [fileId, val] of Object.entries(filesRaw)) {
          const v = val as { dataUrl?: string; mimeType?: string };
          if (v?.dataUrl) files[fileId] = { dataUrl: v.dataUrl, mimeType: v.mimeType };
        }
      }
      await saveCurrentState(id, { elements: [...elements], appState: { ...appState }, files }, user.uid);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Save whiteboard failed', e);
      setSaveStatus('error');
    }
  }, [board, id, user?.uid]);

  const handleExcalidrawChange = useCallback(() => {
    if (!isEditable(role)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      persistState();
    }, 1000);
  }, [role, persistState]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleBlur = useCallback(() => {
    if (!board || !id || role !== 'owner') return;
    const t = title.trim() || board.title;
    if (t === board.title) return;
    updateBoardMeta(id, { title: t }).catch(console.error);
    setBoard((prev) => (prev ? { ...prev, title: t } : null));
  }, [board, id, title, role]);

  const handleDelete = useCallback(async () => {
    if (!board || !id) return;
    try {
      await deleteBoard(id);
      const q = teamId ? `?teamId=${teamId}&companyId=${companyId ?? 'default'}` : '';
      navigate(`/platform/whiteboards${q}`);
    } catch (e) {
      setError(messageFromCaught(e));
    }
    setDeleteConfirm(false);
  }, [board, id, navigate, teamId, companyId]);

  const backHref = teamId
    ? `/platform/whiteboards?teamId=${teamId}&companyId=${companyId ?? 'default'}`
    : '/platform/whiteboards';

  if (loading || (id === 'new' && !error)) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>Loading…</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>{error}</h2>
          <Link to={backHref} style={{ color: '#002B4D', fontWeight: 600 }}>
            Back to Whiteboards
          </Link>
        </div>
      </Layout>
    );
  }

  if (!board || id === 'new') return null;

  const canEdit = isEditable(role);
  const isOwner = role === 'owner';

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
            onBlur={handleTitleBlur}
            placeholder="Whiteboard title"
            readOnly={!isOwner}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#111827',
              ...(!isOwner ? { background: '#f9fafb', cursor: 'default' } : {}),
            }}
          />
          {canEdit && (
            <button
              type="button"
              onClick={() => persistState()}
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
              Save
            </button>
          )}
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
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
          {isOwner && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              style={{
                padding: '8px 16px',
                background: '#fff',
                color: '#dc2626',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Delete
            </button>
          )}
          <Link
            to={backHref}
            style={{ padding: '8px 16px', color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}
          >
            Back
          </Link>
        </div>

        <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
          {initialData && (
            <ExcalidrawShell
              initialData={initialData}
              viewModeEnabled={role === 'viewer'}
              onReady={(api) => {
                excalidrawApiRef.current = api;
              }}
              onChange={handleExcalidrawChange}
            />
          )}
        </div>
      </div>

      {shareOpen && <ShareWhiteboardModal boardId={id!} onClose={() => setShareOpen(false)} />}

      {deleteConfirm && (
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
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '360px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#374151', marginBottom: '16px' }}>Delete this whiteboard? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WhiteboardPage;
