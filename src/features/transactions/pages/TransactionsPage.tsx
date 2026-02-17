import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTransactions,
  type Transaction,
  bulkUpdateTransactionPrivacy,
} from "../api/transactions.api";
import { getAccounts, type Account } from "../../accounts/api/accounts.api";
import {
  getCategories,
  type Category,
} from "../../categories/api/categories.api";
import {
  Search,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Plus,
  EyeOff,
} from "lucide-react";
import AddTransactionModal from "../components/AddTransactionModal";
import { useHousehold } from "../../../store/household.context";

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { viewMode } = useHousehold();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || "",
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [accountId, setAccountId] = useState(
    searchParams.get("accountId") || "all",
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || "all",
  );

  // Data for filters
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    // Load accounts for filter
    getAccounts()
      .then((data) => setAccounts(data.accounts))
      .catch(console.error);

    // Load categories for filter
    getCategories()
      .then((data) => setCategories(data.categories))
      .catch(console.error);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactions({
        page: pagination.page,
        limit: pagination.limit,
        search,
        startDate,
        endDate,
        accountId,
        categoryId,
      });
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    startDate,
    endDate,
    accountId,
    categoryId,
  ]);

  useEffect(() => {
    fetchTransactions();
    // Update URL params
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (accountId !== "all") params.set("accountId", accountId);
    if (categoryId !== "all") params.set("categoryId", categoryId);
    if (pagination.page > 1) params.set("page", pagination.page.toString());
    setSearchParams(params);
  }, [fetchTransactions, setSearchParams]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(amount));
  };

  const handleBulkPrivacy = async (isHidden: boolean) => {
    if (selectedIds.size === 0) return;

    try {
      setLoading(true);
      await bulkUpdateTransactionPrivacy(Array.from(selectedIds), isHidden);
      await fetchTransactions();
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to update privacy:", err);
      setError("Failed to update transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchTransactions}
        accounts={accounts}
        categories={categories}
      />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all your banking transactions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>

          {/* Account Filter */}
          <div className="relative min-w-[150px]">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative min-w-[150px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                <path d="M7 7h.01" />
              </svg>
            </div>
            <select
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range (Simplified as input date for now) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                className="pl-3 pr-2 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative">
              <input
                type="date"
                className="pl-3 pr-2 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="font-medium text-emerald-900">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-px bg-emerald-200" />
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBulkPrivacy(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <EyeOff className="w-4 h-4" />
                Hide from household
              </button>
              <button
                onClick={() => handleBulkPrivacy(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Mark as visible
              </button>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No transactions found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3 w-10">
                      <button onClick={toggleAll} className="flex items-center">
                        {selectedIds.size === transactions.length &&
                        transactions.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3">
                      Date
                    </th>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3">
                      Description
                    </th>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3 hidden md:table-cell">
                      Account
                    </th>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3 hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-3 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions
                    .filter(
                      (tx) =>
                        viewMode === "personal" || !tx.isHiddenFromHousehold,
                    )
                    .map((tx) => {
                      const isSelected = selectedIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-muted/50 transition-colors ${
                            isSelected ? "bg-emerald-50/50" : ""
                          }`}
                        >
                          <td className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4">
                            <button onClick={() => toggleSelection(tx.id)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4 text-muted-foreground whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4">
                            <div className="font-medium text-foreground flex items-center gap-2">
                              {tx.merchant}
                              {tx.isHiddenFromHousehold && (
                                <EyeOff className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            {tx.description !== tx.merchant && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">
                                {tx.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4 text-muted-foreground hidden md:table-cell">
                            {tx.accountName}
                          </td>
                          <td className="px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4 hidden md:table-cell">
                            {tx.categoryName ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                                {tx.categoryName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                Uncategorized
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 md:px-4 md:py-3 xl:px-6 xl:py-4 text-right font-medium ${
                              tx.direction === "credit"
                                ? "text-emerald-600"
                                : "text-foreground"
                            }`}
                          >
                            {tx.direction === "credit" ? "+" : "-"}{" "}
                            {formatCurrency(tx.amount, tx.currencyCode)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.max(1, p.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
