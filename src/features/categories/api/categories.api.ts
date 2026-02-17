import { auth } from "@/lib/firebase";

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense" | "transfer";
  parent_id: number | null;
  parent_name: string | null;
}

export interface GetCategoriesResponse {
  categories: Category[];
}

const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getCategories(): Promise<GetCategoriesResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "Categories fetch failed:",
      response.status,
      response.statusText,
      errorText,
    );
    throw new Error(
      `Failed to fetch categories: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
