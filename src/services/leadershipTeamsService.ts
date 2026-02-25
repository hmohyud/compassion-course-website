import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import type { LeadershipTeam } from '../types/leadership';

const COLLECTION = 'teams';

function toTeam(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipTeam {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    name: (d.name as string) ?? '',
    memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
    boardId: typeof d.boardId === 'string' ? d.boardId : '',
    whiteboardIds: Array.isArray(d.whiteboardIds) ? d.whiteboardIds : [],
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function listTeams(): Promise<LeadershipTeam[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map((d) => toTeam({ id: d.id, data: () => d.data() }));
}

export async function listTeamsForUser(userId: string): Promise<LeadershipTeam[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('memberIds', 'array-contains', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTeam({ id: d.id, data: () => d.data() }));
}

export async function getTeam(id: string): Promise<LeadershipTeam | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? toTeam({ id: snap.id, data: () => snap.data() ?? {} }) : null;
}

export async function createTeam(name: string, memberIds: string[] = []): Promise<LeadershipTeam> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    name,
    memberIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toTeam({ id: snap.id, data: () => snap.data() ?? {} });
}

/** Creates a team and its board (1:1) via direct Firestore writes. Admin-only (enforced by security rules). */
export async function createTeamWithBoard(
  name: string,
  memberIds: string[] = []
): Promise<LeadershipTeam> {
  const uid = auth?.currentUser?.uid;
  console.log('[createTeamWithBoard] creating via Firestore', { uid });

  if (!name.trim()) throw new Error('Team name is required');

  const now = serverTimestamp();
  const teamRef = doc(collection(db, 'teams'));
  const boardRef = doc(collection(db, 'boards'));

  // Create board first, then team (team references boardId)
  await setDoc(boardRef, {
    teamId: teamRef.id,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
  });

  await setDoc(teamRef, {
    name: name.trim(),
    memberIds,
    boardId: boardRef.id,
    whiteboardIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
  });

  const nowDate = new Date();
  return {
    id: teamRef.id,
    name: name.trim(),
    memberIds,
    boardId: boardRef.id,
    whiteboardIds: [],
    createdAt: nowDate,
    updatedAt: nowDate,
  };
}

export async function updateTeam(
  id: string,
  updates: Partial<Pick<LeadershipTeam, 'name' | 'memberIds'>>
): Promise<void> {
  const path = `/${COLLECTION}/${id}`;
  console.log('🧪 Attempting write to', path);
  console.log('🧪 Current UID:', auth.currentUser?.uid);
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.memberIds !== undefined) data.memberIds = updates.memberIds;
  try {
    await updateDoc(ref, data);
    console.log('✅ SUCCESS writing', path);
  } catch (error) {
    console.error('❌ FAILED writing', path, error);
    console.error('❌ Full error object:', error);
    console.error('❌ auth.currentUser?.uid:', auth.currentUser?.uid);
    throw error;
  }
}

/** Patch boardId onto an existing team (used for auto-initialization). */
export async function patchTeamBoardId(teamId: string, boardId: string): Promise<void> {
  const ref = doc(db, COLLECTION, teamId);
  await updateDoc(ref, { boardId, updatedAt: serverTimestamp() });
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Cascade-delete a team and all its data (board, work items, settings) via direct Firestore. Admin-only (enforced by security rules). */
export async function deleteTeamWithData(
  teamId: string
): Promise<{ ok: boolean; workItemsDeleted: number }> {
  if (!teamId) throw new Error('teamId is required');

  // Fetch the team to get its boardId
  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  if (!teamSnap.exists()) throw new Error('Team not found.');
  const teamData = teamSnap.data() || {};
  const boardId = teamData.boardId || '';

  // Delete all work items belonging to this team (batched)
  const workItemsSnap = await getDocs(
    query(collection(db, 'workItems'), where('teamId', '==', teamId))
  );
  let workItemsDeleted = 0;
  if (!workItemsSnap.empty) {
    // Firestore batch limit is 500 — split if needed
    const docs = workItemsSnap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 450);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      workItemsDeleted += chunk.length;
    }
  }

  // Delete team board settings
  const settingsRef = doc(db, 'teamBoardSettings', teamId);
  const settingsSnap = await getDoc(settingsRef);
  if (settingsSnap.exists()) await deleteDoc(settingsRef);

  // Delete the board
  if (boardId) {
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    if (boardSnap.exists()) await deleteDoc(boardRef);
  }

  // Delete the team itself
  await deleteDoc(doc(db, 'teams', teamId));

  return { ok: true, workItemsDeleted };
}
