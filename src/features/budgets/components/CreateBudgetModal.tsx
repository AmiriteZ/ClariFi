import React, { useState } from "react";
import { X } from "lucide-react";
import { createBudget } from "../api/budgets.api";
import { useNavigate } from "react-router-dom";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { useHousehold } from "../../../store/household.context";

export default function CreateBudgetModal({
  isOpen,
  onClose,
}: CreateBudgetModalProps) {
  const navigate = useNavigate();
  const { viewMode, activeHousehold } = useHousehold();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        householdId: viewMode === "household" ? activeHousehold?.id : undefined,
      };
      const { budget } = await createBudget(payload);
      onClose();
      // Navigate to the setup page
      navigate(`/budgets/${budget.id}/setup`);
    } catch (err) {
      console.error("Failed to create budget", err);
      setError(err instanceof Error ? err.message : "Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Create New Budget
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Budget Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g., Monthly Expenses"
              required
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
