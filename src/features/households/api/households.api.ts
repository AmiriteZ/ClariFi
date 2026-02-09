import { auth } from "../../../lib/firebase";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  type: string;
  role: "owner" | "member";
  status: "active" | "pending_approval" | "invited";
  member_count: number;
}

export interface HouseholdDetail extends Household {
  members: HouseholdMember[];
  currentUserRole: "owner" | "member";
}

export interface HouseholdMember {
  id: string;
  display_name: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "pending_approval" | "invited";
  joined_at: string;
}

async function getHeaders() {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getMyHouseholds(): Promise<Household[]> {
  const res = await fetch(`${API_BASE}/households/me`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch households");
  return res.json();
}

export async function createHousehold(name: string): Promise<Household> {
  const res = await fetch(`${API_BASE}/households`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create household");
  return res.json();
}

export async function joinHousehold(
  code: string,
): Promise<{ message: string; householdId: string }> {
  const res = await fetch(`${API_BASE}/households/join`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to join household");
  }
  return res.json();
}

export async function getHouseholdDetails(
  id: string,
): Promise<HouseholdDetail> {
  const res = await fetch(`${API_BASE}/households/${id}`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch household details");
  return res.json();
}

export async function manageMember(
  householdId: string,
  targetUserId: string,
  action: "approve" | "reject" | "kick",
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/households/${householdId}/members/${targetUserId}/${action}`,
    {
      method: "POST",
      headers: await getHeaders(),
    },
  );
  if (!res.ok) throw new Error("Failed to manage member");
}

export async function getHouseholdDashboard(id: string) {
  const res = await fetch(`${API_BASE}/households/${id}/dashboard`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch household dashboard");
  return res.json();
}
