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

export interface GoalContribution {
  id: string;
  amount: number;
  createdAt: string;
  sourceType: string | null;
}

export interface GoalDetailResponse {
  goal: GoalSummary & { createdAt: string };
  contributions: GoalContribution[];
}

interface GetGoalsResponse {
  householdId: string | null;
  goals: GoalSummary[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getGoals(
  householdId?: string,
): Promise<GetGoalsResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  let url = `${API_BASE}/goals`;
  if (householdId) {
    url += `?householdId=${householdId}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch goals");
  }

  return res.json();
}

export async function setFavouriteGoal(
  goalId: string,
): Promise<{ goal: GoalSummary }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/goals/${goalId}/favourite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  householdId?: string;
}

export async function createGoal(input: CreateGoalInput) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/goals`, {
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
  return data as { householdId: string | null; goal: GoalSummary };
}

export async function getGoalDetail(
  goalId: string,
): Promise<GoalDetailResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/goals/${goalId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch goal detail");
  }

  return data as GoalDetailResponse;
}

export async function updateGoal(
  goalId: string,
  updates: {
    name?: string;
    targetAmount?: number;
    targetDate?: string | null;
    status?: string;
    currencyCode?: string;
  },
): Promise<{ goal: GoalSummary }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/goals/${goalId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update goal");
  return data;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`http://localhost:5001/api/goals/${goalId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete goal");
  }
}

export async function addContribution(
  goalId: string,
  data: { amount: number; notes: string; date: string },
): Promise<{ contribution: GoalContribution }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/goals/${goalId}/contributions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const resData = await res.json();
  if (!res.ok) throw new Error(resData.error || "Failed to add contribution");
  return resData;
}

export async function deleteContribution(
  goalId: string,
  contributionId: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(
    `${API_BASE}/goals/${goalId}/contributions/${contributionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete contribution");
  }
}
