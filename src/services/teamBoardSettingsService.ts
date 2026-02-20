import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { TeamBoardSettings, WorkItemLane, WorkItemStatus } from '../types/leadership';

const COLLECTION = 'teamBoardSettings';

const DEFAULT_LANES: WorkItemLane[] = ['expedited', 'fixed_date', 'standard', 'intangible'];

function toSettings(teamId: string, data: Record<string, unknown> | undefined): TeamBoardSettings {
  if (!data) {
    return { teamId, updatedAt: new Date() };
  }
  const visibleLanes = data.visibleLanes;
  return {
    teamId,
    boardMode: data.boardMode === 'scrum' ? 'scrum' : 'kanban',
    visibleLanes: Array.isArray(visibleLanes)
      ? (visibleLanes as WorkItemLane[])
          .filter((l) => DEFAULT_LANES.includes(l))
          .sort((a, b) => DEFAULT_LANES.indexOf(a) - DEFAULT_LANES.indexOf(b))
      : undefined,
    columnHeaders:
      data.columnHeaders && typeof data.columnHeaders === 'object'
        ? (data.columnHeaders as Partial<Record<WorkItemStatus, string>>)
        : undefined,
    showBacklogOnBoard: data.showBacklogOnBoard === true,
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function getTeamBoardSettings(teamId: string): Promise<TeamBoardSettings> {
  const ref = doc(db, COLLECTION, teamId);
  const snap = await getDoc(ref);
  return toSettings(teamId, snap.exists() ? snap.data() : undefined);
}

export async function setTeamBoardSettings(
  teamId: string,
  settings: Partial<Omit<TeamBoardSettings, 'teamId' | 'updatedAt'>>
): Promise<TeamBoardSettings> {
  const ref = doc(db, COLLECTION, teamId);
  const data: Record<string, unknown> = {
    ...settings,
    updatedAt: serverTimestamp(),
  };
  if (settings.visibleLanes !== undefined) data.visibleLanes = settings.visibleLanes;
  if (settings.columnHeaders !== undefined) data.columnHeaders = settings.columnHeaders;
  if (settings.boardMode !== undefined) data.boardMode = settings.boardMode;
  if (settings.showBacklogOnBoard !== undefined) data.showBacklogOnBoard = settings.showBacklogOnBoard;
  await setDoc(ref, data, { merge: true });
  const snap = await getDoc(ref);
  return toSettings(teamId, snap.data());
}
