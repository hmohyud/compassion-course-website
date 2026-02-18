import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ContentItem, getContentBySection } from '../services/contentService';

interface ContentContextType {
  content: { [section: string]: { [key: string]: ContentItem } };
  getContent: (section: string, key: string, defaultValue?: string) => string;
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
  const [content, setContent] = useState<{ [section: string]: { [key: string]: ContentItem } }>({});
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get content value
  const getContent = (section: string, key: string, defaultValue: string = ''): string => {
    const sectionContent = content[section];
    if (!sectionContent) return defaultValue;
    
    const item = sectionContent[key];
    if (!item) return defaultValue;
    
    if (typeof item.value === 'string') return item.value;
    return defaultValue;
  };

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    let contentLoaded = false;

    try {
      // Check if db is initialized
      if (!db) {
        console.warn('Firebase db not initialized, skipping content listeners');
        setLoading(false);
        return;
      }

      // Safety timeout: if the content listener hasn't fired after 5s, stop blocking the UI
      const safetyTimeout = setTimeout(() => {
        if (!contentLoaded) {
          contentLoaded = true;
          setLoading(false);
        }
      }, 5000);

      // Listen to general website content
      const contentQuery = query(
        collection(db, 'content'),
        where('isActive', '==', true),
        orderBy('section', 'asc'),
        orderBy('order', 'asc')
      );
      const unsubscribeContent = onSnapshot(
        contentQuery,
        (snapshot) => {
          const contentItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as ContentItem[];

          // Organize content by section and key
          const organizedContent: { [section: string]: { [key: string]: ContentItem } } = {};
          contentItems.forEach(item => {
            if (!organizedContent[item.section]) {
              organizedContent[item.section] = {};
            }
            organizedContent[item.section][item.key] = item;
          });

          setContent(organizedContent);
          // Mark loading done once the primary content listener delivers data
          if (!contentLoaded) {
            contentLoaded = true;
            clearTimeout(safetyTimeout);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error listening to content:', error);
          setError('Failed to load content');
          if (!contentLoaded) {
            contentLoaded = true;
            clearTimeout(safetyTimeout);
            setLoading(false);
          }
        }
      );
      unsubscribes.push(unsubscribeContent);

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
    getContent,
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
