import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  getWhiteboard,
  createWhiteboard,
  updateWhiteboard,
  DEFAULT_COMPANY_ID,
} from '../../services/whiteboardService';
import type { Whiteboard, WhiteboardCanvasState } from '../../types/whiteboard';
import { Excalidraw } from '@excalidraw/excalidraw';

function normalizeInitialData(canvasState: WhiteboardCanvasState): { elements: readonly unknown[]; appState: Record<string, unknown> } {
  const elements = Array.isArray(canvasState?.elements) ? canvasState.elements : [];
  const appState = canvasState?.appState != null && typeof canvasState.appState === 'object' && !Array.isArray(canvasState.appState)
    ? canvasState.appState as Record<string, unknown>
    : {};
  return { elements, appState };
}

const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<WhiteboardCanvasState | null>(null);

  useEffect(() => {
    if (!id || !user?.uid) return;

    if (id === 'new') {
      (async () => {
        try {
          const wb = await createWhiteboard(DEFAULT_COMPANY_ID, user.uid, { title: 'Untitled whiteboard' });
          navigate(`/platform/whiteboards/${wb.id}`, { replace: true });
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
        const wb = await getWhiteboard(DEFAULT_COMPANY_ID, id);
        if (cancelled) return;
        if (!wb) {
          setError('Whiteboard not found');
          setLoading(false);
          return;
        }
        setWhiteboard(wb);
        setTitle(wb.title);
      } catch (e) {
        if (!cancelled) {
          console.error('Load whiteboard failed', e);
          setError('Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user?.uid, navigate]);

  const persistCanvas = useCallback(
    async (canvasState: WhiteboardCanvasState) => {
      if (!whiteboard || !id || id === 'new') return;
      if (JSON.stringify(lastSavedRef.current) === JSON.stringify(canvasState)) return;
      setSaveStatus('saving');
      try {
        await updateWhiteboard(DEFAULT_COMPANY_ID, id, {
          title: title.trim() || whiteboard.title,
          canvasState,
        });
        lastSavedRef.current = canvasState;
        setSaveStatus('saved');
        setWhiteboard((prev) =>
          prev ? { ...prev, title: title.trim() || prev.title, canvasState, updatedAt: new Date() } : null
        );
      } catch (e) {
        console.error('Save whiteboard failed', e);
        setSaveStatus('error');
      }
    },
    [whiteboard, id, title]
  );

  const handleExcalidrawChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (!whiteboard || !id || id === 'new') return;
      const canvasState: WhiteboardCanvasState = {
        elements: Array.isArray(elements) ? [...elements] : [],
        appState: appState && typeof appState === 'object' ? { ...appState } : {},
      };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistCanvas(canvasState);
      }, 1500);
    },
    [whiteboard, id, persistCanvas]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (loading || (id === 'new' && !whiteboard && !error)) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
          Loading…
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>{error}</h2>
          <Link to="/platform/whiteboards" style={{ color: '#002B4D', fontWeight: 600 }}>
            Back to Whiteboards
          </Link>
        </div>
      </Layout>
    );
  }

  if (!whiteboard || id === 'new') return null;

  const initialData = normalizeInitialData(whiteboard.canvasState);

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
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
          <Link
            to="/platform/whiteboards"
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
          <Excalidraw
            initialData={{
              elements: initialData.elements,
              appState: initialData.appState,
            }}
            onChange={handleExcalidrawChange}
          />
        </div>
      </div>
    </Layout>
  );
};

export default WhiteboardPage;
