import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function DashboardPage() {
  // later will use my API to fetch user-specific data and 3D model
  const dashboardData = {
    summary: {
      totalBalance: 2314.52,
      monthIncome: 3400,
      monthExpenses: 1840.35,
    },
    spendingByCategory: [
      { category: "Food", amount: 320 },
      { category: "Rent", amount: 1200 },
      { category: "Transport", amount: 120 },
    ],
    recentTransactions: [
      {
        id: 1,
        date: "10/11/2025",
        merchant: "Tesco",
        category: "Groceries",
        amount: -42.5,
      },
      {
        id: 2,
        date: "09/11/2025",
        merchant: "Netflix",
        category: "Subscription",
        amount: -12.99,
      },
    ],
    mainGoal: {
      name: "Holiday Fund",
      currentAmount: 450,
      targetAmount: 2000,
    },
    insights: [
      "You’ve spent 48% of your monthly budget so far.",
      "Your Transport spending is 15% lower than last month.",
      "At your current saving rate, you’ll reach your Holiday Fund in ~5 months.",
    ],
  };

  const goalProgress =
    (dashboardData.mainGoal.currentAmount /
      dashboardData.mainGoal.targetAmount) *
    100;

  return (
    <div className="w-full h-full px-10 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-6">
          {/* === TOP ROW === */}
          <div className="grid grid-cols-2 gap-6">
            {/* 1. Total Balance */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Total Balance
              </h2>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                €{dashboardData.summary.totalBalance.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Across all linked accounts
              </p>
            </section>

            {/* 2. Income vs Expenses */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                This Month
              </h2>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-emerald-500">
                    Income
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    €{dashboardData.summary.monthIncome.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-rose-500">
                    Expenses
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    €{dashboardData.summary.monthExpenses.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">Net</p>
                  <p className="text-xl font-semibold text-slate-900">
                    €
                    {(
                      dashboardData.summary.monthIncome -
                      dashboardData.summary.monthExpenses
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* === MIDDLE ROW === */}
          <div className="grid grid-cols-2 gap-6">
            {/* 3. Spending by Category */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-6 shadow-sm min-h-[260px]">
              <h2 className="text-sm font-semibold text-slate-900">
                Spending by Category
              </h2>

              <div className="mt-4 flex items-center gap-6">
                {/* Chart container */}
                <div className="h-64 w-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.spendingByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        stroke="none"
                      >
                        {dashboardData.spendingByCategory.map(
                          (entry, index) => (
                            <Cell
                              key={entry.category}
                              fill={`hsl(${index * 60}, 70%, 50%)`}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend / list */}
                <ul className="space-y-2 text-sm font-medium text-slate-700">
                  {dashboardData.spendingByCategory.map((item) => (
                    <li
                      key={item.category}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{item.category}</span>
                      <span className="font-semibold">
                        €{item.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 4. Recent Transactions */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-6 shadow-sm min-h-[260px]">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Transactions
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                {dashboardData.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl bg-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-slate-900">{tx.merchant}</p>
                      <p className="text-xs text-slate-600">
                        {tx.date} • {tx.category}
                      </p>
                    </div>
                    <p
                      className={`font-semibold ${
                        tx.amount < 0 ? "text-rose-500" : "text-emerald-500"
                      }`}
                    >
                      {tx.amount < 0 ? "-" : "+"}€
                      {Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* === BOTTOM ROW === */}
          <div className="grid grid-cols-2 gap-6">
            {/* 5. Main Goal with Progress */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Main Goal
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {dashboardData.mainGoal.name}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                €{dashboardData.mainGoal.currentAmount.toFixed(2)} / €
                {dashboardData.mainGoal.targetAmount.toFixed(2)}
              </p>
              <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {goalProgress.toFixed(0)}% complete
              </p>
            </section>

            {/* 6. Smart Insights / Alerts */}
            <section className="rounded-2xl border border-slate-300 bg-slate-100 px-6 py-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Smart Insights
              </h2>

              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {dashboardData.insights.slice(0, 2).map((insight, index) => (
                  <li
                    key={index}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-xs"
                  >
                    {insight}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] text-slate-500">
                These insights will become interactive with your AI assistant
                later.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
