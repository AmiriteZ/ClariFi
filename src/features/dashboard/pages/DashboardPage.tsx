// src/features/dashboard/pages/DashboardPage.tsx
import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuthStore } from "../../../store/auth.store";
import { auth } from "../../../lib/firebase";
import { getDashboard, type DashboardResponse } from "../api/dashboard.api";
import { renewExpiredBudgets } from "../../budgets/api/budgets.api";
import { useHousehold } from "../../../store/household.context";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  ArrowRightLeft,
  Target,
  Lightbulb,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/Card";
import { cn } from "../../../lib/utils";
import CashFlowChart from "../../../components/charts/CashFlowChart";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { viewMode, activeHousehold } = useHousehold();
  const { user, token } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState<"spending" | "cashflow">(
    "cashflow",
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const freshToken = await auth.currentUser?.getIdToken();
        if (!freshToken) {
          setError("Not authenticated");
          return;
        }

        await renewExpiredBudgets().catch((err) => {
          console.warn("Failed to renew budgets:", err);
        });

        let data: DashboardResponse;
        if (viewMode === "household" && activeHousehold) {
          data = await getDashboard(freshToken, activeHousehold.id);
        } else {
          data = await getDashboard(freshToken);
        }

        setDashboardData(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [user, viewMode, activeHousehold],
  );

  useEffect(() => {
    if (user && token) {
      void loadData();
    }
  }, [user, token, loadData]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
        <p className="text-neutral-500 mb-4">
          Please sign in to view your dashboard.
        </p>
        <Button onClick={() => navigate("/start")}>Go to Login</Button>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error: {error}</p>
        <Button
          onClick={() => loadData(true)}
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const goalProgress =
    dashboardData.mainGoal.targetAmount > 0
      ? (dashboardData.mainGoal.currentAmount /
          dashboardData.mainGoal.targetAmount) *
        100
      : 0;

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {viewMode === "household" && activeHousehold
              ? `${activeHousehold.name} Dashboard`
              : "Overview"}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Here's what's happening with your finances today.
          </p>
        </div>
        <Button
          onClick={() => loadData(true)}
          disabled={refreshing}
          variant="outline"
          className="w-full md:w-auto"
        >
          <RefreshCw
            className={cn("mr-2 w-4 h-4", refreshing && "animate-spin")}
          />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-brand-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Total Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-brand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              €{dashboardData.summary.totalBalance.toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Across all accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Monthly Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              €{dashboardData.summary.monthIncome.toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              In {new Date().toLocaleString("default", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Monthly Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              €{dashboardData.summary.monthExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              In {new Date().toLocaleString("default", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Net Cash Flow
            </CardTitle>
            <div className="h-4 w-4 text-neutral-400 font-bold">€</div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                dashboardData.summary.monthIncome -
                  dashboardData.summary.monthExpenses >=
                  0
                  ? "text-neutral-900 dark:text-white"
                  : "text-rose-500",
              )}
            >
              €
              {(
                dashboardData.summary.monthIncome -
                dashboardData.summary.monthExpenses
              ).toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Net for this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Main Chart Area (Spending or Cast Flow) */}
        <Card className="lg:col-span-4 shadow-sm hover:shadow-md transition-shadow min-h-[400px] flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                {activeChart === "spending" ? (
                  <>
                    <PieChartIcon className="w-5 h-5 text-brand-500" />
                    Spending by Category
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-brand-500" />
                    Cash Flow Analysis
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {activeChart === "spending"
                  ? "Breakdown of your expenses this month"
                  : "Income vs Expenses trends over time"}
              </CardDescription>
            </div>

            {/* Chart Switcher */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setActiveChart("cashflow")}
                className={cn(
                  "px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs font-medium rounded-md transition-all",
                  activeChart === "cashflow"
                    ? "bg-white dark:bg-black text-foreground shadow-sm border border-neutral-200 dark:border-neutral-700"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setActiveChart("spending")}
                className={cn(
                  "px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs font-medium rounded-md transition-all",
                  activeChart === "spending"
                    ? "bg-white dark:bg-black text-foreground shadow-sm border border-neutral-200 dark:border-neutral-700"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Spending
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-[300px]">
            {activeChart === "cashflow" ? (
              <CashFlowChart />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {dashboardData.spendingByCategory.length > 0 ? (
                  <>
                    <div className="flex-1 w-full relative min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.spendingByCategory}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={90}
                            outerRadius={120}
                            paddingAngle={4}
                          >
                            {dashboardData.spendingByCategory.map(
                              (_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                  strokeWidth={0}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            formatter={(
                              value: number,
                              name: string,
                              props: any,
                            ) => [
                              `€${value.toFixed(2)}`,
                              props.payload.category,
                            ]}
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-sm text-neutral-500">Total</p>
                          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                            €
                            {dashboardData.spendingByCategory
                              .reduce((a, b) => a + b.amount, 0)
                              .toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {dashboardData.spendingByCategory.map((item, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between text-sm p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              />
                              <span
                                className="text-neutral-600 dark:text-neutral-400 truncate text-xs"
                                title={item.category}
                              >
                                {item.category}
                              </span>
                            </div>
                            <span className="font-semibold text-neutral-900 dark:text-white shrink-0 ml-1.5 text-xs">
                              €{item.amount.toFixed(0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 min-h-[300px]">
                    <PieChartIcon className="w-16 h-16 mb-2 opacity-50" />
                    <p>No spending data yet</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Transactions */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand-500" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest transactions from your accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentTransactions.length > 0 ? (
                  dashboardData.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            tx.amount < 0
                              ? "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                          )}
                        >
                          {tx.amount < 0 ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : (
                            <TrendingUp className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-brand-600 transition-colors w-[140px]">
                            {tx.merchant}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {tx.category} • {tx.date}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-semibold whitespace-nowrap",
                          tx.amount < 0
                            ? "text-neutral-900 dark:text-white"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {tx.amount < 0 ? "-" : "+"}€
                        {Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    No recent transactions
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                onClick={() => navigate("/transactions")}
              >
                View All
              </Button>
            </CardContent>
          </Card>

          {/* Main Goal */}
          <Card
            className="cursor-pointer hover:border-brand-300 transition-all shadow-sm hover:shadow-md"
            onClick={() =>
              dashboardData.mainGoal.id &&
              navigate(`/goals/${dashboardData.mainGoal.id}`)
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-purple-500" />
                Main Goal: {dashboardData.mainGoal.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    €{dashboardData.mainGoal.currentAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    of €{dashboardData.mainGoal.targetAmount.toFixed(2)} goal
                  </p>
                </div>
                <span className="text-sm font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                  {goalProgress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-brand-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border-indigo-100 dark:border-indigo-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-indigo-900 dark:text-indigo-100">
                <Lightbulb className="w-4 h-4" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {dashboardData.insights.slice(0, 2).map((insight, index) => (
                  <li
                    key={index}
                    className="text-sm text-indigo-800 dark:text-indigo-200 bg-white/50 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-indigo-100/50"
                  >
                    {insight}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-indigo-400 mt-2 text-center">
                AI insights powered by your financial data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
