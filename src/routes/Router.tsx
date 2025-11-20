import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import App from "../App";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import AppShell from "../components/layout/AppShell";
import { useAuthStore } from "../store/auth.store";
import SignUpPage from "../features/auth/pages/SignUpPage";
import WelcomePage from "../features/welcome/pages/WelcomePage";
import GoalsPage from "../features/goals/pages/GoalsPage";
import GoalDetailPage from "../features/goals/pages/GoalDetailPage";
import BudgetsPage from "../features/budgets/pages/BudgetsPage";
import BudgetSetupPage from "../features/budgets/pages/BudgetSetupPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/start" replace />;
  return <>{children}</>;
}

export default function Router() {
  return (
    <Routes>
      <Route element={<App />}>
        <Route path="/start" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <AppShell>
                <GoalsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals/:goalId"
          element={
            <ProtectedRoute>
              <AppShell>
                <GoalDetailPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <AppShell>
                <BudgetsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:budgetId/setup"
          element={
            <ProtectedRoute>
              <AppShell>
                <BudgetSetupPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
