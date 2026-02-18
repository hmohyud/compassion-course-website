// Leadership Portal: messages, teams, work items

export interface LeadershipMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  readBy: string[]; // user IDs who have read
}

export interface LeadershipTeam {
  id: string;
  name: string;
  memberIds: string[];
  /** Required: board doc id in boards collection (single source of truth). */
  boardId: string;
  /** Required: whiteboard doc ids in whiteboards collection. */
  whiteboardIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export type WorkItemType = 'task';

export type WorkItemLane = 'expedited' | 'fixed_date' | 'standard' | 'intangible';

export interface WorkItemComment {
  id: string;
  userId: string;
  userName?: string;
  text: string;
  createdAt: Date;
  /** Set when a comment is edited. */
  editedAt?: Date;
  /** User IDs mentioned in this comment (for notifications). */
  mentionedUserIds?: string[];
}

export interface LeadershipWorkItem {
  id: string;
  title: string;
  description?: string;
  /** @deprecated Use assigneeIds instead. Kept for backward compatibility with existing data. */
  assigneeId?: string;
  /** Multiple assignees for this work item. */
  assigneeIds?: string[];
  teamId?: string;
  status: WorkItemStatus;
  dueDate?: Date;
  blocked?: boolean;
  type?: WorkItemType;
  lane?: WorkItemLane;
  estimate?: number;
  /** Manual sort order within a column. Lower values appear first. */
  position?: number;
  comments?: WorkItemComment[];
  /** Timestamp when item first moved to in_progress */
  startedAt?: Date;
  /** Timestamp when item first moved to done */
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Board 1:1 with team; created when team is created */
export interface LeadershipBoard {
  id: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Per-team board display settings (Kanban lanes and column headers) */
export type BoardMode = 'scrum' | 'kanban';

export interface TeamBoardSettings {
  teamId: string;
  boardMode?: BoardMode;
  /** Which swimlanes to show; default all if unset */
  visibleLanes?: WorkItemLane[];
  /** Custom column labels; key = status id, value = display label. Leave blank for default. */
  columnHeaders?: Partial<Record<WorkItemStatus, string>>;
  /** Show the backlog as a column on the main board instead of a separate tab */
  showBacklogOnBoard?: boolean;
  updatedAt: Date;
}

/** Working agreements for a team (one doc per team) */
export interface LeadershipWorkingAgreement {
  teamId: string;
  items: string[];
  createdAt?: Date;
  updatedAt: Date;
}

/**
 * @deprecated Use team.whiteboardIds and whiteboards collection instead. Read-only; do not add new usage.
 * Team-scoped whiteboard (tldraw snapshot)
 */
export interface LeadershipTeamWhiteboard {
  id: string;
  teamId: string;
  title: string;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
