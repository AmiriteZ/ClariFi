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
            className="text-xs text-slate-600 underline mb-3"
          >
            ← Back to goals
          </button>
          <p className="text-sm text-red-500">
            {error || "Failed to load goal details"}
          </p>
        </div>
      </div>
    );
  }

  const { goal, contributions } = data;

  return (
    <div className="w-full h-full px-10 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/goals")}
          className="text-xs text-slate-600 underline"
        >
          ← Back to goals
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {goal.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
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
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Edit Goal"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="Delete Goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary card */}
        <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-4 shadow-sm">
          <p className="text-sm text-slate-700">
            {goal.totalContributed.toLocaleString("en-IE", {
              style: "currency",
              currency: goal.currencyCode,
            })}{" "}
            <span className="text-slate-500">/</span>{" "}
            {goal.targetAmount.toLocaleString("en-IE", {
              style: "currency",
              currency: goal.currencyCode,
            })}{" "}
            saved
          </p>

          <div className="mt-3 w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${Math.min(goal.percentComplete, 100)}%`,
              }}
            />
          </div>

          <p className="mt-1 text-xs text-slate-600">
            {goal.percentComplete.toFixed(1)}% complete
          </p>

          {goal.targetDate && (
            <p className="mt-2 text-xs text-slate-600">
              Target date:{" "}
              {new Date(goal.targetDate).toLocaleDateString("en-GB")}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            Status:{" "}
            <span className="font-medium text-slate-700">{goal.status}</span>
          </p>
        </section>

        {/* Add Contribution Button */}
        <button
          onClick={() => setIsContributeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Contribution
        </button>

        {/* Contributions */}
        <section className="rounded-2xl border border-slate-300 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Contributions
          </h2>

          {contributions.length === 0 ? (
            <p className="text-xs text-slate-500">
              No contributions yet. Click "Add Contribution" to start saving.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {contributions.map((c: GoalContribution) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 group"
                >
                  <div>
                    <p className="text-slate-900">
                      {c.amount.toLocaleString("en-IE", {
                        style: "currency",
                        currency: goal.currencyCode,
                      })}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString("en-GB")}{" "}
                      {c.sourceType ? `• ${c.sourceType}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setContributionToDelete(c.id)}
                    className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
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
