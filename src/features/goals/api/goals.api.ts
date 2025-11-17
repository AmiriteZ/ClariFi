// src/features/goals/api/goals.api.ts
import { auth } from "../../../lib/firebase"; // adjust if needed

export interface GoalSummary {
  id: string;
  name: string;
  targetAmount: number;
  currencyCode: string;
  targetDate: string | null;
  status: string;
  totalContributed: number;
  percentComplete: number;
  isFavourite: boolean;
}

interface GetGoalsResponse {
  householdId: string | null;
  goals: GoalSummary[];
}

export async function getGoals(): Promise<GetGoalsResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/goals", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch goals");
  }

  return res.json();
}

export async function setFavouriteGoal(goalId: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch(
    `http://localhost:5001/api/goals/${goalId}/favourite`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to set favourite goal");
  }

  return data as { goal: GoalSummary };
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  currencyCode: string;
  targetDate?: string;
  categoryName?: string;
}

export async function createGoal(input: CreateGoalInput) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to create goal");
  }

  // { householdId, goal }
  return data;
}
