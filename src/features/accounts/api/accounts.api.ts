import { auth } from "../../../lib/firebase";

export interface Account {
  id: string;
  name: string;
  accountType: string;
  currencyCode: string;
  currentBalance: number;
  maskedRef: string;
  institutionName: string;
  lastSyncedAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getAccounts(): Promise<{ accounts: Account[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch accounts");
  return data;
}

export async function deleteAccount(accountId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/accounts/${accountId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete account");
  }
}
