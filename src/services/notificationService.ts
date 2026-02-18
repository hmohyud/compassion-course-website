import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const COLLECTION = 'userNotifications';

export type NotificationType = 'mention';

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  workItemId: string;
  workItemTitle: string;
  teamId?: string;
  commentId: string;
  commentTextSnippet: string;
  fromUserId: string;
  fromUserName: string;
  createdAt: Date;
  read: boolean;
}

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date();
}

function fromDoc(id: string, data: Record<string, unknown>): UserNotification {
  return {
    id,
    userId: (data.userId as string) ?? '',
    type: (data.type as NotificationType) ?? 'mention',
    workItemId: (data.workItemId as string) ?? '',
    workItemTitle: (data.workItemTitle as string) ?? '',
    teamId: data.teamId != null && data.teamId !== '' ? (data.teamId as string) : undefined,
    commentId: (data.commentId as string) ?? '',
    commentTextSnippet: (data.commentTextSnippet as string) ?? '',
    fromUserId: (data.fromUserId as string) ?? '',
    fromUserName: (data.fromUserName as string) ?? '',
    createdAt: toDate(data.createdAt),
    read: data.read === true,
  };
}

const SNIPPET_MAX = 80;

function snippet(text: string): string {
  const t = text.trim();
  if (t.length <= SNIPPET_MAX) return t;
  return t.slice(0, SNIPPET_MAX) + '…';
}

/**
 * Create a notification for each mentioned user when a comment is saved.
 */
export async function createMentionNotifications(
  workItemId: string,
  workItemTitle: string,
  teamId: string | undefined,
  commentId: string,
  commentText: string,
  fromUserId: string,
  fromUserName: string,
  mentionedUserIds: string[]
): Promise<void> {
  const deduped = [...new Set(mentionedUserIds)].filter((id) => id);
  if (deduped.length === 0) return;

  const ref = collection(db, COLLECTION);
  const preview = snippet(commentText);

  await Promise.all(
    deduped.map((userId) =>
      addDoc(ref, {
        userId,
        type: 'mention',
        workItemId,
        workItemTitle,
        ...(teamId ? { teamId } : {}),
        commentId,
        commentTextSnippet: preview,
        fromUserId,
        fromUserName,
        createdAt: serverTimestamp(),
        read: false,
      })
    )
  );
}

function isIndexOrQueryError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message ?? '');
  return code === 'failed-precondition' || /index|indexes/i.test(message);
}

export async function listNotificationsForUser(
  userId: string,
  limitCount: number = 20
): Promise<UserNotification[]> {
  const ref = collection(db, COLLECTION);
  const primaryQuery = query(
    ref,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  try {
    const snap = await getDocs(primaryQuery);
    return snap.docs.map((d) => fromDoc(d.id, d.data()));
  } catch (primaryErr) {
    if (!isIndexOrQueryError(primaryErr)) throw primaryErr;
    const fallbackQuery = query(ref, where('userId', '==', userId), limit(limitCount));
    const fallbackSnap = await getDocs(fallbackQuery);
    const list = fallbackSnap.docs.map((d) => fromDoc(d.id, d.data()));
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const ref = doc(db, COLLECTION, notificationId);
  await updateDoc(ref, { read: true });
}
