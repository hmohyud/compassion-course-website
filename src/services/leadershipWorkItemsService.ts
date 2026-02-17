import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane, WorkItemComment } from '../types/leadership';

const COLLECTION = 'workItems';

const VALID_LANES: WorkItemLane[] = ['expedited', 'fixed_date', 'standard', 'intangible'];

function parseComment(c: unknown): WorkItemComment | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  const id = o.id as string;
  const userId = o.userId as string;
  const text = o.text as string;
  if (!id || !userId || !text) return null;
  const createdAt = (o.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date();
  const mentionedUserIds = Array.isArray(o.mentionedUserIds)
    ? (o.mentionedUserIds as string[]).filter((x) => typeof x === 'string')
    : undefined;
  return {
    id,
    userId,
    userName: o.userName as string | undefined,
    text,
    createdAt,
    ...(mentionedUserIds?.length ? { mentionedUserIds } : {}),
  };
}

function toWorkItem(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipWorkItem {
  const d = docSnap.data() ?? {};
  const status = (d.status as WorkItemStatus) ?? 'backlog';
  const validStatus: WorkItemStatus[] = ['backlog', 'todo', 'in_progress', 'done'];
  const lane = d.lane as WorkItemLane | undefined;
  const commentsRaw = Array.isArray(d.comments) ? d.comments : [];
  const comments: WorkItemComment[] = commentsRaw.map(parseComment).filter((c): c is WorkItemComment => c != null);
  // Build assigneeIds: prefer stored array, fall back to legacy single assigneeId
  const rawAssigneeIds = Array.isArray(d.assigneeIds) ? (d.assigneeIds as string[]).filter(Boolean) : [];
  const legacyAssigneeId = d.assigneeId as string | undefined;
  const assigneeIds = rawAssigneeIds.length > 0
    ? rawAssigneeIds
    : (legacyAssigneeId ? [legacyAssigneeId] : []);

  return {
    id: docSnap.id,
    title: (d.title as string) ?? '',
    description: d.description as string | undefined,
    assigneeId: assigneeIds[0] || undefined,
    assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
    teamId: d.teamId as string | undefined,
    status: validStatus.includes(status) ? status : 'backlog',
    dueDate: (d.dueDate as { toDate: () => Date })?.toDate?.() ?? undefined,
    blocked: d.blocked === true,
    type: d.type === 'task' ? 'task' : undefined,
    lane: lane && VALID_LANES.includes(lane) ? lane : undefined,
    estimate: typeof d.estimate === 'number' && [0.5, 1, 1.5, 2].includes(d.estimate) ? d.estimate : undefined,
    comments: comments.length > 0 ? comments : undefined,
    startedAt: (d.startedAt as { toDate: () => Date })?.toDate?.() ?? undefined,
    completedAt: (d.completedAt as { toDate: () => Date })?.toDate?.() ?? undefined,
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function listWorkItems(teamId?: string): Promise<LeadershipWorkItem[]> {
  const ref = collection(db, COLLECTION);
  const q = teamId && teamId !== '' ? query(ref, where('teamId', '==', teamId)) : query(ref);
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toWorkItem({ id: d.id, data: () => d.data() }));
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return items;
}

/** Main backlog: items not assigned to any team (teamId null/missing) */
export async function listMainBacklog(): Promise<LeadershipWorkItem[]> {
  const all = await listWorkItems();
  const unassigned = all.filter((w) => w.teamId == null || w.teamId === '');
  unassigned.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return unassigned;
}

/** Team backlog: items for this team with status backlog */
export async function listTeamBacklog(teamId: string): Promise<LeadershipWorkItem[]> {
  const all = await listWorkItems(teamId);
  return all.filter((w) => w.status === 'backlog').sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** All items in Backlog status, from any team or no team */
export async function listAllBacklogStatusItems(): Promise<LeadershipWorkItem[]> {
  const all = await listWorkItems();
  return all.filter((w) => w.status === 'backlog').sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** All blocked items, from any team or no team */
export async function listAllBlockedItems(): Promise<LeadershipWorkItem[]> {
  const all = await listWorkItems();
  return all.filter((w) => w.blocked === true).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function listWorkItemsForUser(assigneeId: string): Promise<LeadershipWorkItem[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('assigneeId', '==', assigneeId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toWorkItem({ id: d.id, data: () => d.data() }));
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return items;
}

export async function getWorkItem(id: string): Promise<LeadershipWorkItem | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? toWorkItem({ id: snap.id, data: () => snap.data() ?? {} }) : null;
}

export async function createWorkItem(data: {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  teamId?: string;
  status?: WorkItemStatus;
  dueDate?: Date;
  blocked?: boolean;
  type?: 'task';
  lane?: WorkItemLane;
  estimate?: number;
  comments?: WorkItemComment[];
}): Promise<LeadershipWorkItem> {
  const ref = collection(db, COLLECTION);
  const commentsForFirestore = data.comments?.map((c) => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
    ...(c.mentionedUserIds?.length ? { mentionedUserIds: c.mentionedUserIds } : {}),
  }));
  // Normalize assignees: prefer assigneeIds, fall back to assigneeId
  const ids = data.assigneeIds?.filter(Boolean) ?? (data.assigneeId ? [data.assigneeId] : []);
  const docRef = await addDoc(ref, {
    title: data.title,
    description: data.description ?? null,
    assigneeId: ids[0] ?? null,
    assigneeIds: ids.length > 0 ? ids : null,
    teamId: data.teamId ?? null,
    status: data.status ?? 'backlog',
    dueDate: data.dueDate ?? null,
    blocked: data.blocked === true,
    type: data.type ?? 'task',
    lane: data.lane && VALID_LANES.includes(data.lane) ? data.lane : 'standard',
    estimate: data.estimate ?? null,
    comments: commentsForFirestore ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(docRef);
  return toWorkItem({ id: snap.id, data: () => snap.data() ?? {} });
}

export async function updateWorkItem(
  id: string,
  updates: Partial<Pick<LeadershipWorkItem, 'title' | 'description' | 'assigneeId' | 'assigneeIds' | 'teamId' | 'status' | 'dueDate' | 'blocked' | 'type' | 'lane' | 'estimate' | 'comments' | 'startedAt' | 'completedAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description;
  // Handle assignees: prefer assigneeIds, keep assigneeId in sync
  if (updates.assigneeIds !== undefined) {
    const ids = updates.assigneeIds.filter(Boolean);
    data.assigneeIds = ids.length > 0 ? ids : null;
    data.assigneeId = ids[0] ?? null;
  } else if (updates.assigneeId !== undefined) {
    data.assigneeId = updates.assigneeId;
    data.assigneeIds = updates.assigneeId ? [updates.assigneeId] : null;
  }
  if (updates.teamId !== undefined) data.teamId = updates.teamId;
  if (updates.status !== undefined) {
    data.status = updates.status;
    // Auto-set startedAt when moving to in_progress (only if not already set)
    if (updates.status === 'in_progress' && updates.startedAt === undefined) {
      // Read existing doc to check if startedAt is already set
      const existingSnap = await getDoc(ref);
      const existingData = existingSnap.data() ?? {};
      if (!existingData.startedAt) {
        data.startedAt = serverTimestamp();
      }
    }
    // Auto-set completedAt when moving to done
    if (updates.status === 'done') {
      data.completedAt = serverTimestamp();
    }
    // Clear completedAt if moving back from done
    if (updates.status !== 'done' && updates.completedAt === undefined) {
      data.completedAt = null;
    }
  }
  if (updates.dueDate !== undefined) data.dueDate = updates.dueDate;
  if (updates.blocked !== undefined) data.blocked = updates.blocked;
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.lane !== undefined) data.lane = VALID_LANES.includes(updates.lane) ? updates.lane : 'standard';
  if (updates.estimate !== undefined) data.estimate = updates.estimate;
  if (updates.startedAt !== undefined) data.startedAt = updates.startedAt;
  if (updates.completedAt !== undefined) data.completedAt = updates.completedAt;
  if (updates.comments !== undefined) {
    data.comments = updates.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
      ...(c.mentionedUserIds?.length ? { mentionedUserIds: c.mentionedUserIds } : {}),
    }));
  }
  const path = `/${COLLECTION}/${id}`;
  try {
    await updateDoc(ref, data);
  } catch (error) {
    console.error('updateWorkItem failed', path, error);
    console.error('auth.currentUser?.uid:', auth.currentUser?.uid);
    throw error;
  }
}

export async function deleteWorkItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
