import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGoalDetail } from "../api/goals.api";

import type {
  GoalDetailResponse,
  GoalContribution,
} from "../api/goals.api";

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<GoalDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setError("No goal ID provided.");
      return;
    }

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

    void load(goalId);
  }, [goalId]);

  

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
              Created on{" "}
              {new Date(goal.createdAt).toLocaleDateString("en-GB")}
            </p>
          </div>

          {goal.isFavourite && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-500">
              <span className="text-lg">★</span>
              Main goal
            </span>
          )}
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
            <span className="font-medium text-slate-700">
              {goal.status}
            </span>
          </p>
        </section>

        {/* Contributions */}
        <section className="rounded-2xl border border-slate-300 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Contributions
          </h2>

          {contributions.length === 0 ? (
            <p className="text-xs text-slate-500">
              No contributions yet. Later you&apos;ll be able to add manual
              top-ups or link transactions here.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {contributions.map((c: GoalContribution) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2"
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
