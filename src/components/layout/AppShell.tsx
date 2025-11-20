import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function doLogout() {
    logout();
    navigate("/start", { replace: true });
  }

  return (
    <div className="min-h-screen grid grid-rows-[56px_1fr]">
      <header className="flex items-center justify-between px-4 border-b bg-white">
        <Link to="/dashboard" className="font-semibold">
          {import.meta.env.VITE_APP_NAME || "ClariFi"}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{user?.name}</span>
          <button onClick={doLogout} className="rounded-lg border px-3 py-1">
            Logout
          </button>
        </div>
      </header>

      <main className="grid md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block border-r p-4 bg-slate-50">
          <nav className="space-y-2 text-sm">
            <Link to="/dashboard" className="block">
              Overview
            </Link>
            <span className="block opacity-50">(3D scene later)</span>

            {/* 🔥 NEW GOALS BUTTON */}
            <Link
              to="/goals"
              className="block mt-4 font-medium text-slate-700 hover:text-indigo-600"
            >
              Goals
            </Link>

            {/* 🔥 NEW BUDGETS BUTTON */}
            <Link
              to="/budgets"
              className="block mt-2 font-medium text-slate-700 hover:text-indigo-600"
            >
              Budgets
            </Link>
          </nav>
        </aside>

        <section>{children}</section>
      </main>
    </div>
  );
}
