import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { getBudgetView, type BudgetViewData } from "../api/budgets.api";

export default function BudgetViewPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<BudgetViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    if (!budgetId) return;
    loadBudgetView(budgetId);
  }, [budgetId]);

  async function loadBudgetView(id: string) {
    try {
      setLoading(true);
      setError(null);
      const viewData = await getBudgetView(id);
      setData(viewData);
    } catch (err) {
      console.error("Failed to load budget view", err);
      setError("Failed to load budget details");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!budgetId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this budget? This action cannot be undone."
    );

    if (confirmed) {
      try {
        const user = (await import("../../../lib/firebase")).auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        await fetch(`http://localhost:5001/api/budgets/${budgetId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        navigate("/budgets");
      } catch (err) {
        console.error("Failed to delete budget", err);
        alert("Failed to delete budget");
      }
    }
  }

  const formatCurrency = (amount: number, currencyCode?: string) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currencyCode || data?.budget.currencyCode || "EUR",
    }).format(amount);
  };

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-IE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "over":
        return "text-red-600 bg-red-50";
      case "near":
        return "text-yellow-600 bg-yellow-50";
      case "hit":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-emerald-600 bg-emerald-50";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "over":
        return "bg-red-500";
      case "near":
        return "bg-yellow-500";
      case "hit":
        return "bg-blue-500";
      default:
        return "bg-emerald-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "over":
        return <AlertCircle className="w-4 h-4" />;
      case "near":
        return <AlertTriangle className="w-4 h-4" />;
      case "hit":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  function getHealthIcon(status: "healthy" | "warning" | "danger") {
    if (status === "danger")
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (status === "warning")
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <TrendingUp className="w-5 h-5 text-emerald-500" />;
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading budget details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Budget not found"}</p>
        <button
          onClick={() => navigate("/budgets")}
          className="text-sm text-emerald-600 hover:underline"
        >
          Back to Budgets
        </button>
      </div>
    );
  }

  const filteredTransactions = selectedCategory
    ? data.transactions.filter((t) => t.categoryId === selectedCategory)
    : data.transactions;

  return (
    <div className="w-full h-full px-10 py-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/budgets")}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Budgets
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/budgets/${budgetId}/setup`)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Budget"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Budget"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Budget Title & Period */}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {data.budget.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data.budget.periodType.charAt(0).toUpperCase() +
              data.budget.periodType.slice(1)}{" "}
            Budget • {formatDate(data.budget.periodStart)} -{" "}
            {formatDate(data.budget.periodEnd)}
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Total Budgeted</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {formatCurrency(data.summary.totalBudgeted)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Total Spent</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {formatCurrency(data.summary.totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Remaining</p>
            <p
              className={`text-2xl font-semibold mt-2 ${
                data.summary.totalRemaining >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(data.summary.totalRemaining)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Used</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {data.summary.percentageUsed.toFixed(1)}%
            </p>
            <div className="mt-3 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  data.summary.percentageUsed > 100
                    ? "bg-red-500"
                    : data.summary.percentageUsed > 85
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(data.summary.percentageUsed, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Budget Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Budget Health
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {data.summary.periodElapsed.toFixed(0)}% of period elapsed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getHealthIcon(data.analytics.healthStatus)}
              <span
                className={`text-sm font-medium ${
                  data.analytics.healthStatus === "danger"
                    ? "text-red-600"
                    : data.analytics.healthStatus === "warning"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {data.analytics.healthStatus.charAt(0).toUpperCase() +
                  data.analytics.healthStatus.slice(1)}
              </span>
            </div>
          </div>

          {data.analytics.projectedOverage > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">
                Projected Overspend
              </p>
              <p className="text-xs text-red-700 mt-1">
                At current spending rate, you may exceed budget by{" "}
                <span className="font-semibold">
                  {formatCurrency(
                    data.analytics.projectedOverage,
                    data.budget.currencyCode
                  )}
                </span>
              </p>
            </div>
          )}

          {data.analytics.overBudgetCategories.length > 0 && (
            <div className="mt-3 rounded-xl bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-900">
                Over Budget Categories
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {data.analytics.overBudgetCategories.join(", ")}
              </p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Category Breakdown
          </h2>
          <div className="space-y-3">
            {data.categories.map((category) => (
              <div
                key={category.categoryId}
                onClick={() => setSelectedCategory(category.categoryId)}
                className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${getStatusColor(
                        category.status
                      )}`}
                    >
                      {getStatusIcon(category.status)}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {category.categoryName}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {category.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(category.spent)}
                    </p>
                    <p className="text-sm text-slate-500">
                      of {formatCurrency(category.budgeted)}
                    </p>
                  </div>
                </div>

                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${getProgressColor(
                      category.status
                    )}`}
                    style={{
                      width: `${Math.min(category.percentageUsed, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {category.percentageUsed.toFixed(1)}% used
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedCategory ? "Filtered Transactions" : "All Transactions"}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-emerald-600 hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No transactions found
              </p>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {tx.merchant}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatDate(tx.date)} •{" "}
                      {tx.categoryName || "Uncategorized"} • {tx.accountName}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(
                      Math.abs(tx.amount),
                      data.budget.currencyCode
                    )}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unassigned Transactions */}
        {data.unassigned.length > 0 && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4">
              Unassigned Transactions ({data.unassigned.length})
            </h2>
            <p className="text-sm text-yellow-700 mb-4">
              These transactions don't have a category assigned. Categorize them
              to improve budget accuracy.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.unassigned.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {tx.merchant}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatDate(tx.date)} • {tx.accountName}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(
                      Math.abs(tx.amount),
                      data.budget.currencyCode
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Performance */}
        {data.history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Historical Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.history.map((hist) => (
                <div
                  key={hist.budgetId}
                  className="p-4 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">
                      {new Date(hist.periodStart).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                    <div
                      className={`p-1 rounded-full ${getStatusColor(
                        hist.status
                      )}`}
                    >
                      {getStatusIcon(hist.status)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {Math.round(hist.percentageUsed)}%
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full ${getProgressColor(
                        hist.status
                      )}`}
                      style={{
                        width: `${Math.min(hist.percentageUsed, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500 flex justify-between">
                    <span>{formatCurrency(hist.totalSpent)}</span>
                    <span>{formatCurrency(hist.totalBudgeted)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
