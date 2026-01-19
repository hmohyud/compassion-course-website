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
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Webcast, WebcastSession } from '../types/platform';

const WEBCASTS_COLLECTION = 'webcasts';
const WEBCAST_SESSIONS_COLLECTION = 'webcastSessions';

export async function createWebcast(
  orgId: string,
  title: string,
  description: string,
  scheduledAt: Date,
  hostId: string,
  price: number = 0,
  currency: string = 'USD',
  duration?: number,
  translationLanguages: string[] = [],
  accessType: 'free' | 'paid' | 'member-only' = 'free',
  meetUrl?: string,
  recurrencePattern?: Webcast['recurrencePattern'],
  autoGenerateMeetLink?: boolean
): Promise<Webcast> {
  try {
    const webcastRef = doc(collection(db, WEBCASTS_COLLECTION));
    const webcast: Webcast = {
      id: webcastRef.id,
      orgId,
      title,
      description,
      scheduledAt,
      duration,
      price,
      currency,
      status: 'scheduled',
      translationLanguages,
      hostId,
      accessType,
      meetUrl,
      recurrencePattern,
      autoGenerateMeetLink,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(webcastRef, {
      ...webcast,
      scheduledAt: webcast.scheduledAt,
      createdAt: webcast.createdAt,
      updatedAt: webcast.updatedAt,
      recurrencePattern: webcast.recurrencePattern ? {
        ...webcast.recurrencePattern,
        endDate: webcast.recurrencePattern.endDate || undefined,
      } : undefined,
    });

    // If recurring, create instances
    if (recurrencePattern && recurrencePattern.type !== 'none') {
      await createRecurringWebcastInstances(webcast);
    }

    return webcast;
  } catch (error) {
    console.error('Error creating webcast:', error);
    throw error;
  }
}

export async function getWebcast(webcastId: string): Promise<Webcast | null> {
  try {
    const docRef = doc(db, WEBCASTS_COLLECTION, webcastId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        scheduledAt: data.scheduledAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Webcast;
    }
    return null;
  } catch (error) {
    console.error('Error getting webcast:', error);
    throw error;
  }
}

export async function updateWebcast(
  webcastId: string,
  updates: Partial<Pick<Webcast, 'title' | 'description' | 'scheduledAt' | 'status' | 'recordingUrl' | 'duration' | 'meetUrl' | 'recurrencePattern' | 'translationLanguages' | 'autoGenerateMeetLink'>>
): Promise<void> {
  try {
    const docRef = doc(db, WEBCASTS_COLLECTION, webcastId);
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (updates.scheduledAt) {
      updateData.scheduledAt = updates.scheduledAt;
    }
    
    if (updates.recurrencePattern) {
      updateData.recurrencePattern = {
        ...updates.recurrencePattern,
        endDate: updates.recurrencePattern.endDate || undefined,
      };
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating webcast:', error);
    throw error;
  }
}

export async function updateWebcastMeetUrl(
  webcastId: string,
  meetUrl: string
): Promise<void> {
  try {
    await updateWebcast(webcastId, { meetUrl });
  } catch (error) {
    console.error('Error updating webcast Meet URL:', error);
    throw error;
  }
}

/**
 * Generate a Google Meet link
 * Placeholder for future Google Calendar API integration
 * For now, returns a placeholder URL that admin can replace manually
 */
export async function generateMeetLink(): Promise<string> {
  // TODO: Integrate with Google Calendar API to auto-generate Meet links
  // For now, return a placeholder
  return 'https://meet.google.com/new';
}

/**
 * Get all recurring webcasts
 */
export async function getRecurringWebcasts(orgId?: string): Promise<Webcast[]> {
  try {
    const webcastsRef = collection(db, WEBCASTS_COLLECTION);
    let q = query(
      webcastsRef,
      orderBy('scheduledAt', 'asc')
    );
    
    if (orgId) {
      q = query(
        webcastsRef,
        where('orgId', '==', orgId),
        orderBy('scheduledAt', 'asc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    const allWebcasts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      recurrencePattern: doc.data().recurrencePattern ? {
        ...doc.data().recurrencePattern,
        endDate: doc.data().recurrencePattern.endDate?.toDate(),
      } : undefined,
    })) as Webcast[];
    
    // Filter for recurring webcasts
    return allWebcasts.filter(w => 
      w.recurrencePattern && w.recurrencePattern.type !== 'none'
    );
  } catch (error) {
    console.error('Error getting recurring webcasts:', error);
    throw error;
  }
}

/**
 * Create recurring webcast instances based on recurrence pattern
 */
export async function createRecurringWebcastInstances(
  baseWebcast: Webcast
): Promise<Webcast[]> {
  if (!baseWebcast.recurrencePattern || baseWebcast.recurrencePattern.type === 'none') {
    return [];
  }

  const instances: Webcast[] = [];
  const { type, interval, endDate } = baseWebcast.recurrencePattern;
  const end = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year
  let currentDate = new Date(baseWebcast.scheduledAt);

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addWeeks = (date: Date, weeks: number): Date => {
    return addDays(date, weeks * 7);
  };

  const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  let instanceCount = 0;
  const maxInstances = 100; // Safety limit

  while (currentDate <= end && instanceCount < maxInstances) {
    if (instanceCount > 0) { // Skip first instance (already created)
      const instanceRef = doc(collection(db, WEBCASTS_COLLECTION));
      const instance: Webcast = {
        ...baseWebcast,
        id: instanceRef.id,
        scheduledAt: new Date(currentDate),
        recurrencePattern: undefined, // Instances don't have recurrence
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(instanceRef, {
        ...instance,
        scheduledAt: instance.scheduledAt,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      });

      instances.push(instance);
    }

    // Calculate next date
    switch (type) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
    }

    instanceCount++;
  }

  return instances;
}

export async function getWebcastsByOrganization(orgId: string): Promise<Webcast[]> {
  try {
    const webcastsRef = collection(db, WEBCASTS_COLLECTION);
    const q = query(
      webcastsRef,
      where('orgId', '==', orgId),
      orderBy('scheduledAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Webcast[];
  } catch (error) {
    console.error('Error getting webcasts by organization:', error);
    throw error;
  }
}

export async function getUpcomingWebcasts(orgId?: string): Promise<Webcast[]> {
  try {
    const webcastsRef = collection(db, WEBCASTS_COLLECTION);
    let q = query(
      webcastsRef,
      where('status', 'in', ['scheduled', 'live']),
      orderBy('scheduledAt', 'asc')
    );
    
    if (orgId) {
      q = query(
        webcastsRef,
        where('orgId', '==', orgId),
        where('status', 'in', ['scheduled', 'live']),
        orderBy('scheduledAt', 'asc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Webcast[];
  } catch (error) {
    console.error('Error getting upcoming webcasts:', error);
    throw error;
  }
}

export async function createWebcastSession(
  webcastId: string,
  userId: string,
  language?: string
): Promise<WebcastSession> {
  try {
    const sessionRef = doc(collection(db, WEBCAST_SESSIONS_COLLECTION));
    const session: WebcastSession = {
      id: sessionRef.id,
      webcastId,
      userId,
      joinedAt: new Date(),
      language,
    };

    await setDoc(sessionRef, {
      ...session,
      joinedAt: session.joinedAt,
    });

    return session;
  } catch (error) {
    console.error('Error creating webcast session:', error);
    throw error;
  }
}

export async function updateWebcastSession(
  sessionId: string,
  leftAt: Date
): Promise<void> {
  try {
    const docRef = doc(db, WEBCAST_SESSIONS_COLLECTION, sessionId);
    await updateDoc(docRef, {
      leftAt,
    });
  } catch (error) {
    console.error('Error updating webcast session:', error);
    throw error;
  }
}

export async function getWebcastSessions(webcastId: string): Promise<WebcastSession[]> {
  try {
    const sessionsRef = collection(db, WEBCAST_SESSIONS_COLLECTION);
    const q = query(
      sessionsRef,
      where('webcastId', '==', webcastId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate() || new Date(),
      leftAt: doc.data().leftAt?.toDate(),
    })) as WebcastSession[];
  } catch (error) {
    console.error('Error getting webcast sessions:', error);
    throw error;
  }
}

export async function deleteWebcast(webcastId: string): Promise<void> {
  try {
    const docRef = doc(db, WEBCASTS_COLLECTION, webcastId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting webcast:', error);
    throw error;
  }
}
