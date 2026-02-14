import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  getWhiteboard,
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

const TeamWhiteboardPage: React.FC = () => {
  const { teamId, whiteboardId } = useParams<{ teamId: string; whiteboardId: string }>();
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<WhiteboardCanvasState | null>(null);

  useEffect(() => {
    if (!whiteboardId || !teamId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const wb = await getWhiteboard(DEFAULT_COMPANY_ID, whiteboardId);
        if (cancelled) return;
        if (!wb) {
          setError('Whiteboard not found');
          return;
        }
        if (wb.teamId !== teamId) {
          setError('Whiteboard not found for this team');
          return;
        }
        setWhiteboard(wb);
        setTitle(wb.title);
      } catch (e) {
        if (!cancelled) {
          console.error('Load team whiteboard failed', e);
          setError('Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whiteboardId, teamId]);

  const persistCanvas = useCallback(
    async (canvasState: WhiteboardCanvasState) => {
      if (!whiteboard || !whiteboardId) return;
      if (JSON.stringify(lastSavedRef.current) === JSON.stringify(canvasState)) return;
      setSaveStatus('saving');
      try {
        await updateWhiteboard(DEFAULT_COMPANY_ID, whiteboardId, {
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
    [whiteboard, whiteboardId, title]
  );

  const handleExcalidrawChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (!whiteboard || !whiteboardId) return;
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
    [whiteboard, whiteboardId, persistCanvas]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
          Loading whiteboard…
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#002B4D', marginBottom: '16px' }}>{error}</h2>
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

  if (!whiteboard) return null;

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

export default TeamWhiteboardPage;
