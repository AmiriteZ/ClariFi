import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import type { BudgetSummary } from "../api/budgets.api";

interface BudgetCardProps {
  budget: BudgetSummary;
}

export default function BudgetCard({ budget }: BudgetCardProps) {
  const navigate = useNavigate();

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-md">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {budget.name}
          </h3>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
            {budget.periodType}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" />
          <span>
            {budget.memberNames.length > 0
              ? budget.memberNames.join(", ")
              : "Personal Budget"}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={() => navigate(`/budgets/${budget.id}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        >
          View more
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
