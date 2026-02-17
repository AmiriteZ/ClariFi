import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getGoalDetail,
  updateGoal,
  addContribution,
  deleteGoal,
  deleteContribution,
} from "../api/goals.api";
import { Pencil, Trash2, Plus } from "lucide-react";
import EditGoalModal from "../components/EditGoalModal";
import AddContributionModal from "../components/AddContributionModal";
import DeleteGoalModal from "../components/DeleteGoalModal";
import DeleteContributionModal from "../components/DeleteContributionModal";

import type { GoalDetailResponse, GoalContribution } from "../api/goals.api";

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<GoalDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!goalId) {
      setError("No goal ID provided.");
      return;
    }
    load(goalId);
  }, [goalId]);

  async function load(id: string) {
    try {
      const res = await getGoalDetail(id);
      setData(res);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load goal details";
      setError(message);
    }
  }

  const handleEdit = async (updates: {
    name: string;
    targetAmount: number;
    targetDate: string | null;
    status: string;
    currencyCode: string;
  }) => {
    if (!goalId) return;
    await updateGoal(goalId, updates);
    await load(goalId);
  };

  const handleAddContribution = async (contributionData: {
    amount: number;
    notes: string;
    date: string;
  }) => {
    if (!goalId) return;
    await addContribution(goalId, contributionData);
    await load(goalId);
  };

  const handleDelete = async () => {
    if (!goalId) return;
    try {
      await deleteGoal(goalId);
      navigate("/goals");
    } catch (err) {
      console.error("Failed to delete goal", err);
      alert("Failed to delete goal");
    }
  };

  const handleDeleteContribution = async () => {
    if (!goalId || !contributionToDelete) return;
    try {
      await deleteContribution(goalId, contributionToDelete);
      await load(goalId);
      setContributionToDelete(null);
    } catch (err) {
      console.error("Failed to delete contribution", err);
      alert("Failed to delete contribution");
    }
  };

  if (error || !data) {
    return (
      <div className="w-full h-full px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => navigate("/goals")}
            className="text-xs text-muted-foreground underline mb-3 hover:text-foreground"
          >
            ← Back to goals
          </button>
          <p className="text-sm text-destructive">
            {error || "Failed to load goal details"}
          </p>
        </div>
      </div>
    );
  }

  const { goal, contributions } = data;

  return (
    <div className="w-full h-full px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/goals")}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          ← Back to goals
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {goal.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Created on {new Date(goal.createdAt).toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {goal.isFavourite && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-500 mr-2">
                <span className="text-lg">★</span>
                Main goal
              </span>
            )}
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
              title="Edit Goal"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete Goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary card */}
        <section className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
          <p className="text-sm text-foreground">
            {goal.totalContributed.toLocaleString("en-IE", {
              style: "currency",
              currency: goal.currencyCode,
            })}{" "}
            <span className="text-muted-foreground">/</span>{" "}
            {goal.targetAmount.toLocaleString("en-IE", {
              style: "currency",
              currency: goal.currencyCode,
            })}{" "}
            saved
          </p>

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

          {goal.targetDate && (
            <p className="mt-2 text-xs text-muted-foreground">
              Target date:{" "}
              {new Date(goal.targetDate).toLocaleDateString("en-GB")}
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">{goal.status}</span>
          </p>
        </section>

        {/* Add Contribution Button */}
        <button
          onClick={() => setIsContributeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Contribution
        </button>

        {/* Contributions */}
        <section className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Contributions
          </h2>

          {contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No contributions yet. Click "Add Contribution" to start saving.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {contributions.map((c: GoalContribution) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 group"
                >
                  <div>
                    <p className="text-foreground">
                      {c.amount.toLocaleString("en-IE", {
                        style: "currency",
                        currency: goal.currencyCode,
                      })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("en-GB")}{" "}
                      {c.sourceType ? `• ${c.sourceType}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setContributionToDelete(c.id)}
                    className="p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    title="Delete Contribution"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <EditGoalModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleEdit}
        initialData={{
          name: goal.name,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
          status: goal.status,
          currencyCode: goal.currencyCode,
        }}
      />

      <AddContributionModal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        onSave={handleAddContribution}
        currencyCode={goal.currencyCode}
      />

      <DeleteGoalModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <DeleteContributionModal
        isOpen={!!contributionToDelete}
        onClose={() => setContributionToDelete(null)}
        onConfirm={handleDeleteContribution}
      />
    </div>
  );
}
