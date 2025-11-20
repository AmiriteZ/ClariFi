import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBudgetDetail } from "../api/budgets.api";
import type { BudgetSummary } from "../api/budgets.api";
import { ArrowLeft } from "lucide-react";

export default function BudgetSetupPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!budgetId) return;
    loadBudget(budgetId);
  }, [budgetId]);

  async function loadBudget(id: string) {
    try {
      const { budget } = await getBudgetDetail(id);
      setBudget(budget);
    } catch (err) {
      setError("Failed to load budget details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Budget not found"}</p>
        <button
          onClick={() => navigate("/budgets")}
          className="text-sm text-indigo-600 hover:underline"
        >
          Back to Budgets
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full px-10 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/budgets")}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budgets
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Setup {budget.name}
          </h1>
          <p className="text-slate-500 mb-8">
            Configure your budget settings, periods, and limits.
          </p>

          <div className="rounded-xl bg-slate-50 p-6 border border-dashed border-slate-300">
            <p className="text-slate-600 font-medium">
              Setup options coming soon...
            </p>
            <p className="text-sm text-slate-500 mt-1">
              You will be able to set time periods, link accounts, and define
              category limits here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
