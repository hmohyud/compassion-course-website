import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface ContentContextType {
  content: any;
  boardMembers: any[];
  programs: any[];
  events: any[];
  loading: boolean;
  error: string | null;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<any>({});
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    // Set loading to false immediately to prevent hanging
    setLoading(false);

    try {
      // Check if db is initialized
      if (!db) {
        console.warn('Firebase db not initialized, skipping content listeners');
        return;
      }

      // Listen to board members
      const boardQuery = query(collection(db, 'boardMembers'), orderBy('order', 'asc'));
      const unsubscribeBoard = onSnapshot(
        boardQuery,
        (snapshot) => {
          const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBoardMembers(members);
        },
        (error) => {
          console.error('Error listening to board members:', error);
          setError('Failed to load board members');
        }
      );
      unsubscribes.push(unsubscribeBoard);

      // Listen to programs
      const programsQuery = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
      const unsubscribePrograms = onSnapshot(
        programsQuery,
        (snapshot) => {
          const programsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPrograms(programsList.filter(p => p.isActive));
        },
        (error) => {
          console.error('Error listening to programs:', error);
          setError('Failed to load programs');
        }
      );
      unsubscribes.push(unsubscribePrograms);

      // Listen to events
      const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'));
      const unsubscribeEvents = onSnapshot(
        eventsQuery,
        (snapshot) => {
          const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEvents(eventsList);
        },
        (error) => {
          console.error('Error listening to events:', error);
          setError('Failed to load events');
        }
      );
      unsubscribes.push(unsubscribeEvents);
    } catch (err) {
      console.error('Error setting up content listeners:', err);
      setError('Failed to load content');
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const value = {
    content,
    boardMembers,
    programs,
    events,
    loading,
    error
  };

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};
