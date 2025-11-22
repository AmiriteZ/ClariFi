import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import App from "../App";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import AppShell from "../components/layout/AppShell";
import { useAuthStore } from "../store/auth.store";
import PageTransition from "../components/common/PageTransition";
import SignUpPage from "../features/auth/pages/SignUpPage";
import WelcomePage from "../features/welcome/pages/WelcomePage";
import GoalsPage from "../features/goals/pages/GoalsPage";
import GoalDetailPage from "../features/goals/pages/GoalDetailPage";
import BudgetsPage from "../features/budgets/pages/BudgetsPage";
import BudgetSetupPage from "../features/budgets/pages/BudgetSetupPage";
import BudgetViewPage from "../features/budgets/pages/BudgetViewPage";
import AccountsPage from "../features/accounts/pages/AccountsPage";
import AssistantPage from "../features/assistant/pages/AssistantPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isInitialized } = useAuthStore();

  if (!isInitialized) {
    // Wait for Firebase to initialize before making auth decisions
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

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
                <PageTransition>
                  <DashboardPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <GoalsPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals/:goalId"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <GoalDetailPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <BudgetsPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:budgetId/view"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <BudgetViewPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:budgetId/setup"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <BudgetSetupPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <AccountsPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition>
                  <AssistantPage />
                </PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
