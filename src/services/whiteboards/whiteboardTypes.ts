/**
 * Top-level whiteboard document (Firestore: whiteboards/{boardId})
 */
export interface BoardDoc {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
  teamId?: string;
  teamCompanyId?: string;
}

/**
 * Member document (Firestore: whiteboards/{boardId}/members/{userId})
 */
export type BoardMemberRole = 'owner' | 'editor' | 'viewer';

export interface BoardMemberDoc {
  userId: string;
  role: BoardMemberRole;
  addedAt: Date;
}

/**
 * State document (Firestore: whiteboards/{boardId}/state/current)
 */
export interface FileMeta {
  path?: string;
  mimeType?: string;
}

export interface BoardStateDoc {
  elements: unknown[];
  appState: Record<string, unknown>;
  filesMeta: Record<string, FileMeta>;
  updatedAt: Date;
  updatedBy: string;
}

export interface CreateBoardInput {
  ownerId: string;
  title: string;
  teamId?: string;
  teamCompanyId?: string;
}

export interface UpdateBoardMetaInput {
  title?: string;
  lastOpenedAt?: Date;
}

export interface SaveStateInput {
  elements: unknown[];
  appState: Record<string, unknown>;
  files?: Record<string, { dataUrl?: string; mimeType?: string }>;
}
