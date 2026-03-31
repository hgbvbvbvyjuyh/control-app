// Database schema and types for the productivity app
import Dexie, { type EntityTable } from 'dexie';

// ---- Types ----
export interface Framework {
  id?: string;
  name: string;
  keys: { key: string; label: string; description?: string }[];
  isDefault?: boolean;
  createdAt: number;
  deletedAt?: number;
}

export interface Goal {
  id?: string;
  frameworkId: string;
  goalType: 'yearly' | 'monthly' | 'weekly' | 'daily';
  category?: 'spirituality' | 'finance' | 'health' | 'relation';
  parentId?: string | null;
  isIndependent: boolean;
  data: Record<string, string>;
  progress: number;    // 0-100, auto-calculated by backend
  /** false = no session data for this row’s metric (UI: “no data”, not 0%). */
  progressHasData?: boolean;
  status: 'active' | 'done' | 'not_done' | 'skipped';
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Session {
  id?: string;
  goalId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'skipped';
  didAchieveGoal?: boolean;
  mistake?: string;
  improvementSuggestion?: string;
  skipReason?: string;
  frameworkData?: string;
  deletedAt?: number;
  workTime?: number;
  restTime?: number;
}

export interface JournalEntry {
  id?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string;        // ISO date string for the day/week/month/year
  goalId?: string;     // optional: for goal-specific journaling
  category?: 'spirituality' | 'finance' | 'health' | 'relation';
  content: {
    goals?: string;
    reflection?: string;
    emotions?: string;
    problems?: string;
    ideas?: string;
    // Life Journal fields
    thinking?: { learn: string; mistakes: string; did: string };
    emotions_life?: { feel: string; why: string; next: string };
    problems_life?: { problems: string; solutions: string };
    ideas_life?: string;
    // Goal Journal refinement
    answers?: {
      q1: string;
      q2: string;
      q3: string;
    };
    createdAt?: string;
    type?: string;
    goalId?: string;
  };
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Failure {
  id?: string;
  type: 'session' | 'goal';
  linkedId: string;
  note: string;
  createdAt: number;
  deletedAt?: number;
}

export interface UserProfile {
  id?: string;
  username: string;
  createdAt: number;
}

// ---- Database ----
class ProductivityDB extends Dexie {
  frameworks!: EntityTable<Framework, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  journals!: EntityTable<JournalEntry, 'id'>;
  failures!: EntityTable<Failure, 'id'>;
  users!: EntityTable<UserProfile, 'id'>;

  constructor() {
    super('ProductivityDB');
    this.version(1).stores({
      frameworks: '++id, name, createdAt',
      goals: '++id, frameworkId, createdAt',
      sessions: '++id, goalId, status, startedAt',
      journals: '++id, type, date, goalId, createdAt',
      failures: '++id, type, linkedId, createdAt',
      users: '++id, username',
    });
    // v2: new fields (non-breaking, Dexie can open old data fine)
    this.version(2).stores({
      frameworks: '++id, name, isDefault, createdAt',
      goals: '++id, frameworkId, goalType, parentId, status, createdAt',
      sessions: '++id, goalId, status, startedAt',
      journals: '++id, type, date, goalId, category, createdAt',
      failures: '++id, type, linkedId, createdAt',
      users: '++id, username',
    });

    // v4: simple sessions
    this.version(4).stores({
      sessions: '++id, goalId, status, startTime, didAchieveGoal',
    });
  }
}

export const db = new ProductivityDB();
