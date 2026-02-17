import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { RefreshCw, Users } from "lucide-react";
import { resyncAllAccounts } from "../../features/accounts/api/bankConnections.api";

import { useHousehold } from "../../store/household.context";
// ... imports

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { viewMode, activeHousehold, toggleView, userHouseholds } =
    useHousehold();
  const navigate = useNavigate();
  const [isResyncing, setIsResyncing] = useState(false);

  function doLogout() {
    logout();
    navigate("/start", { replace: true });
  }

  async function handleResync() {
    setIsResyncing(true);
    try {
      const result = await resyncAllAccounts();
      console.log("✅ Resync complete:", result);
      // Optionally show a success message to the user
      if (result.errors && result.errors.length > 0) {
        console.warn("⚠️ Some accounts failed to resync:", result.errors);
      }
    } catch (error) {
      console.error("❌ Resync failed:", error);
      // Optionally show an error message to the user
    } finally {
      setIsResyncing(false);
    }
  }

  const isHouseholdMode = viewMode === "household" && activeHousehold;

  return (
    <div className="min-h-screen grid grid-rows-[56px_1fr] transition-colors">
      <header className="flex items-center justify-between px-4 border-b bg-white border-slate-200">
        <div className="flex items-center gap-2 md:gap-6">
          <Link
            to="/dashboard"
            className="font-semibold text-lg flex items-center gap-2 text-slate-900"
          >
            {import.meta.env.VITE_APP_NAME || "ClariFi"}
          </Link>

          {/* Context Switcher & Household Name */}
          {userHouseholds.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => viewMode === "household" && toggleView()}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "personal" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Personal
                </button>
                <button
                  onClick={() => viewMode === "personal" && toggleView()}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "household" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Household
                </button>
              </div>

              {isHouseholdMode && activeHousehold && (
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <span className="text-emerald-600">
                    <Users className="w-4 h-4" />
                  </span>
                  {activeHousehold.name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/account"
            className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <span className="text-slate-700 font-medium text-sm hidden sm:inline">
              {user?.name}
            </span>
          </Link>
          <button
            onClick={handleResync}
            disabled={isResyncing}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Resync all accounts"
          >
            <RefreshCw
              className={`w-4 h-4 ${isResyncing ? "animate-spin" : ""}`}
            />
            {isResyncing ? "Syncing..." : "Resync"}
          </button>
          <button
            onClick={doLogout}
            className="rounded-lg border px-3 py-1 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="grid md:grid-cols-[220px_1fr] pb-16 md:pb-0">
        <aside className="hidden md:block border-r p-4 bg-slate-50 min-h-[calc(100vh-56px)]">
          <nav className="space-y-2 text-sm sticky top-4">
            <Link
              to="/dashboard"
              className="block px-2 py-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-emerald-700"
            >
              Overview
            </Link>

            <Link
              to="/households"
              className="block mt-4 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              Households
            </Link>

            <Link
              to="/transactions"
              className="block mt-4 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              Transactions
            </Link>

            <Link
              to="/assistant"
              className="block mt-4 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              🤖 AI Assistant
            </Link>

            <Link
              to="/goals"
              className="block mt-4 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              Goals
            </Link>

            <Link
              to="/budgets"
              className="block mt-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              Budgets
            </Link>

            <Link
              to="/accounts"
              className="block mt-2 px-2 py-1.5 rounded-lg font-medium transition-colors text-slate-700 hover:text-emerald-600 hover:bg-slate-200"
            >
              Accounts
            </Link>
          </nav>
        </aside>

        <section className="p-4 overflow-x-hidden">{children}</section>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-50 flex justify-around items-center safe-area-bottom">
        <Link
          to="/dashboard"
          className="flex flex-col items-center p-2 text-slate-600 hover:text-emerald-600"
        >
          <RefreshCw className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          to="/transactions"
          className="flex flex-col items-center p-2 text-slate-600 hover:text-emerald-600"
        >
          <span className="text-lg leading-none">€</span>
          <span className="text-[10px]">Txns</span>
        </Link>
        <Link
          to="/assistant"
          className="flex flex-col items-center p-2 text-slate-600 hover:text-emerald-600"
        >
          <span className="text-lg leading-none">🤖</span>
          <span className="text-[10px]">AI</span>
        </Link>
        <Link
          to="/households"
          className="flex flex-col items-center p-2 text-slate-600 hover:text-emerald-600"
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">House</span>
        </Link>
      </nav>
    </div>
  );
}
