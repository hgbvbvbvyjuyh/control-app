export interface Framework {
    id?: number;
    name: string;
    keys: {
        key: string;
        label: string;
        description?: string;
    }[];
    isDefault: boolean;
    createdAt: number;
}
export interface Goal {
    id?: number;
    frameworkId: number;
    goalType: 'yearly' | 'monthly' | 'weekly' | 'daily';
    parentId?: number | null;
    isIndependent: boolean;
    data: Record<string, string>;
    progress: number;
    status: 'active' | 'completed' | 'skipped' | 'failed';
    createdAt: number;
    updatedAt: number;
}
export interface Session {
    id?: number;
    goalId: number;
    startTime: number;
    endTime?: number;
    status: 'active' | 'completed' | 'skipped';
    didAchieveGoal?: boolean;
    mistake?: string;
    improvementSuggestion?: string;
    skipReason?: string;
}
export interface JournalEntry {
    id?: number;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date: string;
    goalId?: number;
    category?: string;
    content: {
        goals?: string;
        reflection?: string;
        emotions?: string;
        problems?: string;
        ideas?: string;
        answers?: {
            questionId: number;
            answer: string;
        }[];
    };
    createdAt: number;
    updatedAt: number;
}
export interface JournalQuestion {
    id?: number;
    category: string;
    question: string;
    isDefault: boolean;
    createdAt: number;
}
export interface Failure {
    id?: number;
    type: 'session' | 'goal';
    linkedId: number;
    note: string;
    createdAt: number;
}
export interface UserProfile {
    id?: number;
    username: string;
    createdAt: number;
}
//# sourceMappingURL=types.d.ts.map