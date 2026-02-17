// src/features/goals/pages/GoalsPage.tsx
import React, { useEffect, useState } from "react";
import { getGoals, createGoal, setFavouriteGoal } from "../api/goals.api";
import type { GoalSummary } from "../api/goals.api";
import { useNavigate } from "react-router-dom";
import { useHousehold } from "../../../store/household.context";

// High-level goal categories – names must match rows in categories.name
const GOAL_CATEGORIES = [
  { name: "Emergency Fund", label: "Emergency Fund 💼" },
  { name: "Travel", label: "Travel / Holiday ✈️" },
  { name: "Car", label: "New Car 🚗" },
  { name: "House", label: "House / Mortgage 🏡" },
  { name: "Education", label: "Education 🎓" },
  { name: "Wedding", label: "Wedding 💍" },
  { name: "Savings", label: "General Savings 💰" },
  { name: "Other", label: "Other" },
];

export default function GoalsPage() {
  const navigate = useNavigate();
  const { viewMode, activeHousehold } = useHousehold();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create-goal UI state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");
  const [newCurrencyCode, setNewCurrencyCode] = useState("EUR");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Favourite star update state
  const [favouriteUpdatingId, setFavouriteUpdatingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const householdId =
          viewMode === "household" ? activeHousehold?.id : undefined;
        const data = await getGoals(householdId);
        setGoals(data.goals);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load goals";
        setError(message);
        // eslint-disable-next-line no-console
        console.error("Failed to load goals:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [viewMode, activeHousehold]);

  const handleViewMore = (goalId: string) => {
    navigate(`/goals/${goalId}`);
  };

  const handleAddGoalClick = () => {
    setIsCreating(true);
    setCreateError(null);
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewTargetAmount("");
    setNewCurrencyCode("EUR");
    setNewTargetDate("");
    setNewCategoryName("");
    setCreateError(null);
    setCreateLoading(false);
    setIsCreating(false);
  };

  const handleCreateGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const amountNumber = Number(newTargetAmount);

    if (!newName.trim()) {
      setCreateError("Please enter a goal name.");
      return;
    }

    if (!newTargetAmount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setCreateError("Please enter a valid target amount greater than 0.");
      return;
    }

    if (!newCurrencyCode || newCurrencyCode.length !== 3) {
      setCreateError("Currency code must be a 3-letter code (e.g. EUR).");
      return;
    }

    if (!newCategoryName) {
      setCreateError("Please select a category.");
      return;
    }

    try {
      setCreateLoading(true);

      const payload = {
        name: newName.trim(),
        targetAmount: amountNumber,
        currencyCode: newCurrencyCode.toUpperCase(),
        targetDate: newTargetDate || undefined,
        categoryName: newCategoryName,
        householdId: viewMode === "household" ? activeHousehold?.id : undefined,
      };

      const result = await createGoal(payload);
      const createdGoal: GoalSummary = result.goal;

      setGoals((prev) => [...prev, createdGoal]);
      resetCreateForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create goal";
      setCreateError(message);
      // eslint-disable-next-line no-console
      console.error("Failed to create goal:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleFavourite = async (goalId: string) => {
    try {
      setFavouriteUpdatingId(goalId);
      setError(null);

      const result = await setFavouriteGoal(goalId);
      const favGoal = result.goal;

      // Only one favourite at a time
      setGoals((prev) =>
        prev.map((g) => ({
          ...g,
          isFavourite: g.id === favGoal.id,
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to set favourite goal";
      setError(message);
      // eslint-disable-next-line no-console
      console.error("Failed to set favourite goal:", err);
    } finally {
      setFavouriteUpdatingId(null);
    }
  };

  return (
    <div className="w-full h-full px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <h2 className="text-2xl font-semibold text-foreground mb-1">
          {viewMode === "household" && activeHousehold
            ? `${activeHousehold.name} Goals`
            : "Goals"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Track your savings progress and financial targets.
        </p>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading goals…</p>
        )}

        {error && (
          <p className="text-sm text-destructive mb-3">Error: {error}</p>
        )}

        {!loading && !error && goals.length === 0 && !isCreating && (
          <p className="text-sm text-muted-foreground mb-4">
            You don’t have any goals yet. Click the button below to create one.
          </p>
        )}

        {/* GOAL CARDS + CREATE BUTTON/FORM */}
        <div className="space-y-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm"
            >
              {/* Header row: favourite star + name + View More */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Star / favourite icon */}
                  <button
                    type="button"
                    onClick={() => handleToggleFavourite(goal.id)}
                    disabled={favouriteUpdatingId === goal.id}
                    className="rounded-full p-1 hover:bg-muted"
                    aria-label={
                      goal.isFavourite ? "Unset main goal" : "Set as main goal"
                    }
                  >
                    <span
                      className={
                        goal.isFavourite
                          ? "text-yellow-400 text-lg"
                          : "text-muted-foreground/30 text-lg"
                      }
                    >
                      ★
                    </span>
                  </button>

                  <h3 className="text-lg font-semibold text-foreground">
                    {goal.name}
                  </h3>
                </div>

                <button
                  onClick={() => handleViewMore(goal.id)}
                  className="px-4 py-1.5 text-xs font-medium rounded-full border border-border text-foreground hover:bg-muted transition"
                >
                  View More
                </button>
              </div>

              {/* Amount contributed / target */}
              <div className="text-sm text-foreground mt-1">
                {goal.totalContributed.toLocaleString("en-IE", {
                  style: "currency",
                  currency: goal.currencyCode,
                })}{" "}
                <span className="text-muted-foreground">/</span>{" "}
                {goal.targetAmount.toLocaleString("en-IE", {
                  style: "currency",
                  currency: goal.currencyCode,
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-3 w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(goal.percentComplete, 100)}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {goal.percentComplete.toFixed(1)}% complete
              </p>
            </div>
          ))}

          {/* Create goal form OR "+" card */}
          {!loading && !error && (
            <>
              {isCreating ? (
                <form
                  onSubmit={handleCreateGoal}
                  className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-4"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    Create New Goal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Goal name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. Emergency Fund"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Target amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newTargetAmount}
                        onChange={(e) => setNewTargetAmount(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 2000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Currency
                      </label>
                      <select
                        value={newCurrencyCode}
                        onChange={(e) => setNewCurrencyCode(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Target date (optional)
                      </label>
                      <input
                        type="date"
                        value={newTargetDate}
                        onChange={(e) => setNewTargetDate(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select a category</option>
                        {GOAL_CATEGORIES.map((cat) => (
                          <option key={cat.name} value={cat.name}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {createError && (
                    <p className="text-xs text-destructive">{createError}</p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="px-3 py-1.5 text-xs rounded-lg border border-input text-muted-foreground hover:bg-muted"
                      disabled={createLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60"
                      disabled={createLoading}
                    >
                      {createLoading ? "Creating…" : "Create Goal"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={handleAddGoalClick}
                  className="rounded-2xl border-2 border-dashed border-border bg-card h-40 w-full flex items-center justify-center text-5xl text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition"
                >
                  +
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
