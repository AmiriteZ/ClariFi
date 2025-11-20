import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getBudgets } from "../api/budgets.api";
import type { BudgetSummary } from "../api/budgets.api";
import BudgetCard from "../components/BudgetCard";
import CreateBudgetModal from "../components/CreateBudgetModal";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  async function loadBudgets() {
    try {
      setLoading(true);
      const { budgets } = await getBudgets();
      setBudgets(budgets);
    } catch (err) {
      console.error("Failed to load budgets", err);
      setError("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-full px-10 py-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Budgets</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your spending and savings
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Budget
          </button>
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
                className="h-48 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
            <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
              <Plus className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">
              No budgets yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first budget to start tracking your expenses and
              saving goals.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
            >
              Create Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
