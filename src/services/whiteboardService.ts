import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Whiteboard } from '../types/platform';

const WHITEBOARDS_COLLECTION = 'whiteboards';

/** Empty tldraw document snapshot for new boards */
const EMPTY_SNAPSHOT: Record<string, unknown> = {};

export async function createWhiteboard(
  ownerId: string,
  title: string
): Promise<Whiteboard> {
  try {
    const ref = doc(collection(db, WHITEBOARDS_COLLECTION));
    const now = new Date();
    const whiteboard: Whiteboard = {
      id: ref.id,
      ownerId,
      title: title || 'Untitled whiteboard',
      snapshot: EMPTY_SNAPSHOT,
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(ref, {
      ...whiteboard,
      createdAt: now,
      updatedAt: now,
    });

    return whiteboard;
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    throw error;
  }
}

export async function getWhiteboard(whiteboardId: string): Promise<Whiteboard | null> {
  try {
    const docRef = doc(db, WHITEBOARDS_COLLECTION, whiteboardId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ownerId: data.ownerId,
        title: data.title,
        snapshot: data.snapshot ?? EMPTY_SNAPSHOT,
        sharedWith: data.sharedWith ?? [],
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      } as Whiteboard;
    }
    return null;
  } catch (error) {
    console.error('Error getting whiteboard:', error);
    throw error;
  }
}

export async function listWhiteboardsForUser(
  userId: string,
  userEmail: string | null
): Promise<Whiteboard[]> {
  try {
    const coll = collection(db, WHITEBOARDS_COLLECTION);

    const ownedQ = query(
      coll,
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const ownedSnap = await getDocs(ownedQ);
    const owned = ownedSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ownerId: data.ownerId,
        title: data.title,
        snapshot: data.snapshot ?? EMPTY_SNAPSHOT,
        sharedWith: data.sharedWith ?? [],
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      } as Whiteboard;
    });

    let shared: Whiteboard[] = [];
    if (userEmail) {
      const emailLower = userEmail.toLowerCase();
      const sharedQ = query(
        coll,
        where('sharedWith', 'array-contains', emailLower),
        orderBy('updatedAt', 'desc')
      );
      const sharedSnap = await getDocs(sharedQ);
      shared = sharedSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          title: data.title,
          snapshot: data.snapshot ?? EMPTY_SNAPSHOT,
          sharedWith: data.sharedWith ?? [],
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        } as Whiteboard;
      });
    }

    const byId = new Map<string, Whiteboard>();
    [...owned, ...shared].forEach((w) => byId.set(w.id, w));
    return Array.from(byId.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  } catch (error) {
    console.error('Error listing whiteboards:', error);
    throw error;
  }
}

export async function updateWhiteboard(
  whiteboardId: string,
  updates: Partial<Pick<Whiteboard, 'title' | 'snapshot'>>
): Promise<void> {
  try {
    const docRef = doc(db, WHITEBOARDS_COLLECTION, whiteboardId);
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.snapshot !== undefined) updateData.snapshot = updates.snapshot;
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating whiteboard:', error);
    throw error;
  }
}

export async function addShareByEmail(
  whiteboardId: string,
  ownerId: string,
  email: string
): Promise<void> {
  try {
    const wb = await getWhiteboard(whiteboardId);
    if (!wb || wb.ownerId !== ownerId) {
      throw new Error('Whiteboard not found or you are not the owner');
    }
    const emailLower = email.trim().toLowerCase();
    if (!emailLower) return;
    if (wb.sharedWith.includes(emailLower)) return;

    const docRef = doc(db, WHITEBOARDS_COLLECTION, whiteboardId);
    await updateDoc(docRef, {
      sharedWith: [...wb.sharedWith, emailLower],
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error adding share by email:', error);
    throw error;
  }
}

export async function removeShareByEmail(
  whiteboardId: string,
  ownerId: string,
  email: string
): Promise<void> {
  try {
    const wb = await getWhiteboard(whiteboardId);
    if (!wb || wb.ownerId !== ownerId) {
      throw new Error('Whiteboard not found or you are not the owner');
    }
    const emailLower = email.trim().toLowerCase();
    const next = wb.sharedWith.filter((e) => e !== emailLower);
    if (next.length === wb.sharedWith.length) return;

    const docRef = doc(db, WHITEBOARDS_COLLECTION, whiteboardId);
    await updateDoc(docRef, {
      sharedWith: next,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error removing share by email:', error);
    throw error;
  }
}

export async function deleteWhiteboard(
  whiteboardId: string,
  ownerId: string
): Promise<void> {
  try {
    const wb = await getWhiteboard(whiteboardId);
    if (!wb || wb.ownerId !== ownerId) {
      throw new Error('Whiteboard not found or you are not the owner');
    }
    const docRef = doc(db, WHITEBOARDS_COLLECTION, whiteboardId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    throw error;
  }
}
