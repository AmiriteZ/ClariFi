import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import App from "../App";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import Layout from "../components/layout/Layout";
import { useAuthStore } from "../store/auth.store";
import PageTransition from "../components/common/PageTransition";
import WelcomePage from "../features/welcome/pages/WelcomePage";
import GoalsPage from "../features/goals/pages/GoalsPage";
import GoalDetailPage from "../features/goals/pages/GoalDetailPage";
import BudgetsPage from "../features/budgets/pages/BudgetsPage";
import BudgetSetupPage from "../features/budgets/pages/BudgetSetupPage";
import BudgetViewPage from "../features/budgets/pages/BudgetViewPage";
import AccountsPage from "../features/accounts/pages/AccountsPage";
import AssistantPage from "../features/assistant/pages/AssistantPage";
import TransactionsPage from "../features/transactions/pages/TransactionsPage";
import HouseholdsPage from "../features/households/pages/HouseholdsPage";
import AccountPage from "../features/account/pages/AccountPage";
import SettingsPage from "../features/settings/pages/SettingsPage";

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
        <Route path="/login" element={<Navigate to="/start" replace />} />
        <Route path="/signup" element={<Navigate to="/start" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <DashboardPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <GoalsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals/:goalId"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <GoalDetailPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <BudgetsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:budgetId/view"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <BudgetViewPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets/:budgetId/setup"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <BudgetSetupPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <AccountsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <TransactionsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <AssistantPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/households"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <HouseholdsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <AccountPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
