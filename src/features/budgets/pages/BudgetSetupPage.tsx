import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getBudgetDetail,
  getBudgetAccounts,
  getBudgetCategories,
  saveBudgetSetup,
} from "../api/budgets.api";
import ConfirmCancelModal from "../components/ConfirmCancelModal";
import type {
  Account,
  BudgetCategoryGroup,
  CategoryLimit,
} from "../api/budgets.api";
import { ArrowLeft, Save, X } from "lucide-react";

export default function BudgetSetupPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();

  const [budgetName, setBudgetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Period Selection
  const [periodType, setPeriodType] = useState("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Account Selection
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Category Limits
  const [categoryGroups, setCategoryGroups] = useState<BudgetCategoryGroup[]>(
    []
  );
  const [categoryLimits, setCategoryLimits] = useState<Record<number, number>>(
    {}
  );

  // Savings Configuration
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [savingsTargetAmount, setSavingsTargetAmount] = useState<number>(0);
  const [savingsTargetType, setSavingsTargetType] = useState<
    "amount" | "percentage"
  >("amount");
  const [autoRenew, setAutoRenew] = useState<boolean>(false);

  useEffect(() => {
    if (!budgetId) return;
    loadData(budgetId);
  }, [budgetId]);

  const handlePeriodTypeChange = (newType: string) => {
    setPeriodType(newType);

    // Auto-set date range based on period type
    const today = new Date();
    if (newType === "monthly") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setPeriodStart(start.toISOString().split("T")[0]);
      setPeriodEnd(end.toISOString().split("T")[0]);
    } else if (newType === "weekly") {
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setPeriodStart(start.toISOString().split("T")[0]);
      setPeriodEnd(end.toISOString().split("T")[0]);
    }
  };

  async function loadData(id: string) {
    try {
      setLoading(true);
      const [budgetRes, accountsRes, categoriesRes] = await Promise.all([
        getBudgetDetail(id),
        getBudgetAccounts(id),
        getBudgetCategories(id),
      ]);

      const b = budgetRes.budget;
      setBudgetName(b.name);
      setPeriodType(b.periodType);
      setPeriodStart(b.periodStart.split("T")[0]);
      setPeriodEnd(b.periodEnd.split("T")[0]);
      setAutoRenew(b.autoRenew);
      setIncomeAmount(b.incomeAmount || 0);
      setSavingsTargetAmount(b.savingsTargetAmount || 0);
      setSavingsTargetType(b.savingsTargetType || "amount");
      setSelectedAccountIds(b.accountIds);

      // Populate category limits
      const limitsRecord: Record<number, number> = {};
      b.categoryLimits.forEach((limit) => {
        limitsRecord[limit.categoryId] = limit.amount;
      });
      setCategoryLimits(limitsRecord);

      setAccounts(accountsRes.accounts);
      setCategoryGroups(categoriesRes.categoryGroups);
    } catch (err) {
      setError("Failed to load budget setup data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleCategoryLimitChange = (categoryId: number, value: string) => {
    const amount = Math.max(0, parseFloat(value) || 0);
    setCategoryLimits((prev) => ({
      ...prev,
      [categoryId]: amount,
    }));
  };

  const calculateTotalAllocated = () => {
    const totalLimits = Object.values(categoryLimits).reduce(
      (sum, val) => sum + val,
      0
    );
    const savingsValue =
      savingsTargetType === "percentage"
        ? (incomeAmount * savingsTargetAmount) / 100
        : savingsTargetAmount;
    return totalLimits + savingsValue;
  };

  const calculateAllocationPercentage = () => {
    if (incomeAmount === 0) return 0;
    return (calculateTotalAllocated() / incomeAmount) * 100;
  };

  const handleSave = async () => {
    if (!budgetId) return;

    const limitsArray: CategoryLimit[] = Object.entries(categoryLimits)
      .filter(([, amount]) => amount > 0)
      .map(([categoryId, amount]) => ({
        categoryId: parseInt(categoryId),
        amount,
      }));

    try {
      setSaving(true);
      await saveBudgetSetup(budgetId, {
        periodType,
        periodStart,
        periodEnd,
        accountIds: selectedAccountIds,
        categoryLimits: limitsArray,
        incomeAmount: incomeAmount || undefined,
        savingsTargetAmount: savingsTargetAmount || undefined,
        savingsTargetType: savingsTargetType,
        autoRenew: autoRenew,
      });

      navigate("/budgets");
    } catch (err) {
      console.error("Failed to save budget setup", err);
      setError("Failed to save budget setup");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!budgetId) return;

    try {
      // Delete the budget via API
      const user = (await import("../../../lib/firebase")).auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      await fetch(`http://localhost:5001/api/budgets/${budgetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      navigate("/budgets");
    } catch (err) {
      console.error("Failed to delete budget", err);
      setError("Failed to delete budget");
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
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
    <div className="w-full h-full px-10 py-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/budgets")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Budgets
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Setup: {budgetName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure your budget settings
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Budget"}
            </button>
          </div>
        </div>

        {/* Period Selection */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Budget Period
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="monthly"
                  checked={periodType === "monthly"}
                  onChange={(e) => handlePeriodTypeChange(e.target.value)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-slate-700">Monthly</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="weekly"
                  checked={periodType === "weekly"}
                  onChange={(e) => handlePeriodTypeChange(e.target.value)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-slate-700">Weekly</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={periodStart}
                  disabled
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  disabled
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  Auto-renew this budget for the next{" "}
                  {periodType === "monthly" ? "month" : "week"}
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                Budget dates will automatically update to the next period when
                the current one ends.
              </p>
            </div>
          </div>
        </section>

        {/* Account Selection */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Select Accounts
          </h2>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No accounts found. Link your bank accounts first.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => handleAccountToggle(account.id)}
                    className="text-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {account.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {account.maskedRef} • {account.accountType}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {account.currentBalance.toLocaleString("en-IE", {
                      style: "currency",
                      currency: account.currencyCode,
                    })}
                  </p>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Savings Configuration */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Income & Savings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expected Income (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={incomeAmount || ""}
                onChange={(e) =>
                  setIncomeAmount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Enter your expected income"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Savings Target
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={savingsTargetAmount || ""}
                  onChange={(e) =>
                    setSavingsTargetAmount(
                      Math.max(0, parseFloat(e.target.value) || 0)
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Amount or %"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={savingsTargetType}
                  onChange={(e) =>
                    setSavingsTargetType(
                      e.target.value as "amount" | "percentage"
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="amount">Amount (€)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Total Allocated</span>
                <span className="font-medium text-slate-900">
                  €{calculateTotalAllocated().toFixed(2)} / €
                  {incomeAmount.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                {/* Category Limits (Expenses) - Red */}
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{
                    width: `${Math.min(
                      (Object.values(categoryLimits).reduce(
                        (sum, val) => sum + val,
                        0
                      ) /
                        incomeAmount) *
                        100,
                      100
                    )}%`,
                  }}
                  title={`Expenses: €${Object.values(categoryLimits)
                    .reduce((sum, val) => sum + val, 0)
                    .toFixed(2)}`}
                />
                {/* Savings - Green */}
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      ((savingsTargetType === "percentage"
                        ? (incomeAmount * savingsTargetAmount) / 100
                        : savingsTargetAmount) /
                        incomeAmount) *
                        100,
                      100 -
                        (Object.values(categoryLimits).reduce(
                          (sum, val) => sum + val,
                          0
                        ) /
                          incomeAmount) *
                          100
                    )}%`,
                  }}
                  title={`Savings: €${(savingsTargetType === "percentage"
                    ? (incomeAmount * savingsTargetAmount) / 100
                    : savingsTargetAmount
                  ).toFixed(2)}`}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                  Expenses: €
                  {Object.values(categoryLimits)
                    .reduce((sum, val) => sum + val, 0)
                    .toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  Savings: €
                  {(savingsTargetType === "percentage"
                    ? (incomeAmount * savingsTargetAmount) / 100
                    : savingsTargetAmount
                  ).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 text-center">
                {calculateAllocationPercentage().toFixed(1)}% of income
                allocated
                {calculateAllocationPercentage() > 100 && (
                  <span className="text-red-600 font-medium ml-1">
                    (Over budget!)
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Category Limits */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Category Limits
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {categoryGroups.map((group) => (
              <div key={group.parent} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide px-3">
                  {group.parent}
                </h3>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200"
                  >
                    <p className="flex-1 text-sm text-slate-700">{item.name}</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={categoryLimits[item.id] || ""}
                      onChange={(e) =>
                        handleCategoryLimitChange(item.id, e.target.value)
                      }
                      className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      placeholder="€0.00"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmCancelModal
        isOpen={showCancelModal}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
}
