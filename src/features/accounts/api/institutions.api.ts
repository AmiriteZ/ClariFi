import { auth } from "../../../lib/firebase";

export interface Institution {
  id: number;
  name: string;
  country_code: string;
  provider_code: string;
}

export async function getInstitutions(): Promise<Institution[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/institutions", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch institutions");
  return data;
}
