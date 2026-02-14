// Platform Types for Community + Course + Webcast Platform

export interface UserProfile {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  organizations: string[]; // Organization IDs
  role?: PortalRole; // default 'viewer' for new/legacy profiles
  mustChangePassword?: boolean; // when true, user must change password on next login
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  settings: {
    allowPublicCommunities?: boolean;
    defaultMemberRole?: 'Member' | 'Guest';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Community {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'paid';
  settings: {
    allowMemberPosts?: boolean;
    requireApproval?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Space {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  accessRules: 'public' | 'private' | 'paid';
  settings: {
    allowMemberPosts?: boolean;
    requireApproval?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  communityId: string;
  role: 'Owner' | 'Admin' | 'Moderator' | 'Member';
  status: 'active' | 'banned' | 'muted';
  joinedAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  spaceId: string;
  authorId: string;
  content: string; // Rich text
  attachments?: string[]; // URLs
  reactions: Record<string, string[]>; // { reactionType: [userId, ...] }
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string; // For nested comments
  reactions: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  participants: string[]; // User IDs
  name?: string; // For group chats
  lastMessage?: {
    content: string;
    authorId: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  content: string;
  readBy: string[]; // User IDs who read it
  createdAt: Date;
}

export interface Course {
  id: string;
  orgId: string;
  communityId?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  status: 'draft' | 'published';
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  courseId: string;
  order: number;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lesson {
  id: string;
  moduleId: string;
  order: number;
  type: 'video' | 'text' | 'download';
  title: string;
  contentRef: string; // Video URL, text content, or file URL
  duration?: number; // For video lessons
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: Record<string, boolean>; // { lessonId: completed }
  enrolledAt: Date;
  completedAt?: Date;
}

export interface Webcast {
  id: string;
  orgId: string;
  title: string;
  description: string;
  scheduledAt: Date;
  duration?: number; // Minutes
  price: number;
  currency: string;
  status: 'scheduled' | 'live' | 'ended';
  recordingUrl?: string;
  translationLanguages: string[]; // Language codes
  hostId: string;
  accessType: 'free' | 'paid' | 'member-only';
  meetUrl?: string; // Google Meet link (manual or auto-generated)
  recurrencePattern?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly';
    interval: number; // e.g., every 2 weeks
    endDate?: Date;
  };
  autoGenerateMeetLink?: boolean; // Flag for auto-generation
  createdAt: Date;
  updatedAt: Date;
}

export interface WebcastSession {
  id: string;
  webcastId: string;
  userId: string;
  joinedAt: Date;
  language?: string; // For translation
  leftAt?: Date;
}

export interface WebcastTranslation {
  id: string;
  webcastId: string;
  language: string;
  transcript: Array<{
    text: string;
    timestamp: number;
  }>;
  createdAt: Date;
}

export interface Whiteboard {
  id: string;
  ownerId: string;
  title: string;
  snapshot: Record<string, unknown>; // tldraw document JSON
  sharedWith: string[]; // email addresses
  createdAt: Date;
  updatedAt: Date;
}

/** Portal user roles: viewer (read-only), contributor, manager, admin (full portal access) */
export type PortalRole = 'viewer' | 'contributor' | 'manager' | 'admin';

export type UserRole = 'Owner' | 'Admin' | 'Moderator' | 'Member' | 'Guest';
export type Visibility = 'public' | 'private' | 'paid';
export type AccessRule = 'public' | 'private' | 'paid';
