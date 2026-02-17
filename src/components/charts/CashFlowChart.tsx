import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useHousehold } from "../../store/household.context";
import {
  getCashFlow,
  type CashFlowPoint,
} from "../../features/dashboard/api/dashboard.api";
import { auth } from "../../lib/firebase";

export default function CashFlowChart() {
  const { user } = useAuthStore();
  const { activeHousehold, viewMode } = useHousehold();

  const [range, setRange] = useState<"this_week" | "last_week" | "this_month">(
    "this_week",
  );
  const [data, setData] = useState<CashFlowPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const householdId =
          viewMode === "household" ? activeHousehold?.id : undefined;
        const res = await getCashFlow(token, range, householdId);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load chart data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, range, viewMode, activeHousehold]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Cash Flow</h3>

        {/* Simple HTML Select for Dropdown (styled) */}
        <div className="relative">
          <select
            value={range}
            onChange={(e) =>
              setRange(
                e.target.value as "this_week" | "last_week" | "this_month",
              )
            }
            className="appearance-none bg-muted hover:bg-muted/80 border-none text-sm font-medium text-foreground py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
          >
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 min-h-[300px] p-4 relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-card/50 backdrop-blur-[1px] flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        )}

        {error ? (
          <div className="flex items-center justify-center h-full text-red-500 text-sm">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey={range === "this_month" ? "date" : "dayName"}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickMargin={10}
                tickFormatter={(val) => {
                  if (range === "this_month") {
                    // show only day number for month
                    return val.split("-")[2];
                  }
                  return val;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) => `€${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ fontSize: "12px", fontWeight: 500 }}
                labelStyle={{
                  fontSize: "12px",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "8px",
                }}
                formatter={(value: number) => [`€${value.toFixed(2)}`]}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
