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

export async function getAccounts(): Promise<{ accounts: Account[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/accounts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch accounts");
  return data;
}
