import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { LeadershipWorkingAgreement } from '../types/leadership';

const COLLECTION = 'leadershipWorkingAgreements';

function toAgreement(teamId: string, data: Record<string, unknown>): LeadershipWorkingAgreement {
  return {
    teamId,
    items: Array.isArray(data.items) ? (data.items as string[]) : [],
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? undefined,
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function getWorkingAgreementsByTeam(teamId: string): Promise<LeadershipWorkingAgreement | null> {
  const ref = doc(db, COLLECTION, teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toAgreement(teamId, snap.data() ?? {});
}

export async function updateWorkingAgreements(teamId: string, items: string[]): Promise<void> {
  const ref = doc(db, COLLECTION, teamId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, {
      teamId,
      items,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    await setDoc(ref, {
      teamId,
      items,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
