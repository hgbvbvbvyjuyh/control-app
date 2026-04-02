export type GoalType = "yearly" | "monthly" | "weekly" | "daily" | "custom";
export type GoalStatus = "active" | "done" | "not_done";

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  category: string;
  date: string;
  status: GoalStatus;
  parentId: string | null;
  createdAt: string;

  data?: {
    plan?: {
      type: "yearly" | "monthly" | "weekly";
      items: {
        label: string;
        text: string;
      }[];
    };
  };
}

export interface GoalJournal {
  type: "goal";
  goalId: string;
  answers: {
    q1: string;
    q2: string;
    q3: string;
  };
  createdAt: string;
}

export interface Session {
  id: string;
  goalId: string;
  duration: number; // default 90
  status: "pending" | "done" | "missed";
  createdAt: string;
}
