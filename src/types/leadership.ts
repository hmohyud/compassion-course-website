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
  createdAt: Date;
  updatedAt: Date;
}

export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export interface LeadershipWorkItem {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  teamId?: string;
  status: WorkItemStatus;
  dueDate?: Date;
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

/** Working agreements for a team (one doc per team) */
export interface LeadershipWorkingAgreement {
  teamId: string;
  items: string[];
  createdAt?: Date;
  updatedAt: Date;
}

/** Team-scoped whiteboard (tldraw snapshot) */
export interface LeadershipTeamWhiteboard {
  id: string;
  teamId: string;
  title: string;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
