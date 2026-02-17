import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getBudgets, renewExpiredBudgets } from "../api/budgets.api";
import type { BudgetSummary } from "../api/budgets.api";
import BudgetCard from "../components/BudgetCard";
import CreateBudgetModal from "../components/CreateBudgetModal";
import { useHousehold } from "../../../store/household.context";

export default function BudgetsPage() {
  const { viewMode, activeHousehold } = useHousehold();
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    loadBudgets();
  }, [activeTab, viewMode, activeHousehold]);

  async function loadBudgets() {
    try {
      setLoading(true);

      // Check and renew expired budgets first (only when viewing active)
      if (activeTab === "active") {
        await renewExpiredBudgets();
      }

      // Fetch budgets filtered by status and household
      const householdId =
        viewMode === "household" ? activeHousehold?.id : undefined;
      const data = await getBudgets(activeTab, householdId);
      setBudgets(data.budgets);
    } catch (err) {
      console.error("Failed to load budgets", err);
      setError("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-full px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {viewMode === "household" && activeHousehold
                ? `${activeHousehold.name} Budgets`
                : "Budgets"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your spending and savings
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Budget
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("active")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              Active Budgets
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === "completed"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              Completed Budgets
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/50 py-20 text-center">
            <div className="mb-4 rounded-full bg-card p-4 shadow-sm">
              <Plus className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              {activeTab === "active"
                ? "No active budgets"
                : "No completed budgets"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {activeTab === "active"
                ? "Create your first budget to start tracking your expenses and saving goals."
                : "Completed budgets will appear here once their period ends."}
            </p>
            {activeTab === "active" && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
              >
                Create Budget
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}
      </div>

      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          loadBudgets(); // Reload list if they cancelled or finished
        }}
      />
    </div>
  );
}
