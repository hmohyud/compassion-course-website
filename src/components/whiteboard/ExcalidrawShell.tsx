import React, { useMemo } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

export interface ExcalidrawInitialData {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, { url: string; mimeType?: string }>;
}

export interface ExcalidrawShellProps {
  initialData?: ExcalidrawInitialData | null;
  viewModeEnabled?: boolean;
  onReady?: (api: ExcalidrawAPI) => void;
  onChange?: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
}

export interface ExcalidrawAPI {
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, { url: string; mimeType?: string } | File>;
  updateScene: (opts: { elements?: readonly unknown[]; appState?: Record<string, unknown> }) => void;
}

export const ExcalidrawShell: React.FC<ExcalidrawShellProps> = ({
  initialData,
  viewModeEnabled = false,
  onReady,
  onChange,
}) => {
  const normalized = useMemo(() => {
    if (!initialData) return { elements: [], appState: {}, files: undefined };
    const appState = initialData.appState ?? {};
    const collaborators = appState.collaborators;
    const appStateNormalized =
      collaborators != null && !Array.isArray(collaborators)
        ? { ...appState, collaborators: [] }
        : appState;
    return {
      elements: Array.isArray(initialData.elements) ? initialData.elements : [],
      appState: appStateNormalized,
      files: initialData.files,
    };
  }, [initialData]);

  return (
    <Excalidraw
      initialData={{
        elements: normalized.elements,
        appState: normalized.appState,
        files: normalized.files,
      }}
      viewModeEnabled={viewModeEnabled}
      excalidrawAPI={(api) => {
        if (api && onReady) {
          onReady({
            getSceneElements: () => api.getSceneElements(),
            getAppState: () => api.getAppState(),
            getFiles: () => api.getFiles(),
            updateScene: (opts) => api.updateScene(opts),
          });
        }
      }}
      onChange={onChange}
    />
  );
};
