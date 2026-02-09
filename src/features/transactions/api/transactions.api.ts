import { auth } from "@/lib/firebase";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currencyCode: string;
  direction: "debit" | "credit";
  categoryId: string | null;
  categoryName: string | null;
  accountName: string;
  institutionName: string;
  status: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  pagination: Pagination;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  search?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<GetTransactionsResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  const queryParams = new URLSearchParams();

  if (filters.page) queryParams.append("page", filters.page.toString());
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.startDate) queryParams.append("startDate", filters.startDate);
  if (filters.endDate) queryParams.append("endDate", filters.endDate);
  if (filters.accountId && filters.accountId !== "all")
    queryParams.append("accountId", filters.accountId);
  if (filters.categoryId && filters.categoryId !== "all")
    queryParams.append("categoryId", filters.categoryId);
  if (filters.search) queryParams.append("search", filters.search);

  const response = await fetch(`${API_URL}/transactions?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "Transactions fetch failed:",
      response.status,
      response.statusText,
      errorText
    );
    throw new Error(
      `Failed to fetch transactions: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
