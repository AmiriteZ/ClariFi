import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import type { BudgetSummary } from "../api/budgets.api";

interface BudgetCardProps {
  budget: BudgetSummary;
}

export default function BudgetCard({ budget }: BudgetCardProps) {
  const navigate = useNavigate();

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {budget.name}
          </h3>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
            {budget.periodType}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {budget.memberNames.length > 0
              ? budget.memberNames.join(", ")
              : "Personal Budget"}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        <button
          onClick={() => navigate(`/budgets/${budget.id}/view`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          View more
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
