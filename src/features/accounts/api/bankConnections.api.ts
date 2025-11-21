import { auth } from "../../../lib/firebase";

export interface ManualAccountInput {
  name: string;
  accountType: string;
  currencyCode: string;
  startingBalance?: number;
  maskedRef?: string;
}

export interface BankConnection {
  id: string;
  connectionId?: string;
  consentUrl?: string;
  institutionName?: string;
}

interface ManualConnectionResponse {
  connection: { id: string };
  account: {
    id: string;
    name: string;
    accountType: string;
    currencyCode: string;
    currentBalance: number;
  };
}

export async function createManualConnection(
  data: ManualAccountInput
): Promise<ManualConnectionResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/accounts/manual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();
  if (!res.ok)
    throw new Error(responseData.error || "Failed to create manual account");
  return responseData;
}

export async function initiateYapilyConnection(
  institutionId: number
): Promise<BankConnection> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/accounts/connect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ institutionId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to initiate connection");
  return data;
}

export async function syncAccounts(
  connectionId: string,
  consentToken: string
): Promise<{ ok: boolean; accountCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(
    `http://localhost:5001/api/accounts/sync/${connectionId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ consentToken }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to sync accounts");
  return data;
}

export async function resyncAllAccounts(): Promise<{
  ok: boolean;
  accountsUpdated: number;
  connectionsProcessed: number;
  errors?: string[];
}> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/accounts/resync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to resync accounts");
  return data;
}
