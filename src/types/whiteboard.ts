/**
 * Company-scoped (and optionally team-scoped) whiteboard.
 * Persisted at companies/{companyId}/whiteboards/{boardId}.
 */
export interface Whiteboard {
  id: string;
  companyId: string;
  teamId?: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  canvasState: WhiteboardCanvasState;
  collaborators?: string[];
  isArchived?: boolean;
}

/**
 * Serialized Excalidraw state (elements + appState).
 * Defensive: do not assume arrays/objects exist when loading.
 */
export interface WhiteboardCanvasState {
  elements?: unknown[];
  appState?: Record<string, unknown>;
}
