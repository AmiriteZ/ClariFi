import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, RefreshCw, Users } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ScreenOrientationLock } from "./ScreenOrientationLock";
import { useAuthStore } from "../../store/auth.store";
import { useHousehold } from "../../store/household.context";
import { resyncAllAccounts } from "../../features/accounts/api/bankConnections.api";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const { user } = useAuthStore();
  const { viewMode, activeHousehold, toggleView } = useHousehold();

  async function handleResync() {
    setIsResyncing(true);
    try {
      const result = await resyncAllAccounts();
      console.log("✅ Resync complete:", result);
      if (result.errors && result.errors.length > 0) {
        console.warn("⚠️ Some accounts failed to resync:", result.errors);
      }
    } catch (error) {
      console.error("❌ Resync failed:", error);
    } finally {
      setIsResyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex transition-colors duration-300">
      <ScreenOrientationLock />
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 xl:ml-0 transition-margin duration-300">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 xl:hidden h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-neutral-900 dark:text-white">
              ClariFi
            </span>
          </div>

          {/* User Avatar (Mobile) */}
          <div className="w-8 h-8 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <span className="text-xs font-medium">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden xl:flex sticky top-0 z-20 h-16 items-center justify-between px-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            {/* Household Context Switcher */}
            {viewMode && (
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                <button
                  onClick={() => viewMode === "household" && toggleView()}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === "personal"
                      ? "bg-white dark:bg-neutral-700 text-brand-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => viewMode === "personal" && toggleView()}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === "household"
                      ? "bg-white dark:bg-neutral-700 text-brand-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                  }`}
                >
                  Household
                </button>
              </div>
            )}
            {viewMode === "household" && activeHousehold && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-300 rounded-lg text-sm font-medium">
                <Users className="w-4 h-4" />
                {activeHousehold.name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors disabled:opacity-50"
              title="Resync all accounts"
            >
              <RefreshCw
                className={`w-4 h-4 ${isResyncing ? "animate-spin" : ""}`}
              />
              <span className="hidden xl:inline">Resync</span>
            </button>

            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-neutral-900 dark:text-white leading-none">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {user?.email}
              </p>
            </div>
            <div className="w-9 h-9 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900 shadow-sm">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <span className="text-sm font-medium">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 xl:p-8 overflow-y-auto w-full max-w-7xl mx-auto page-fade-in">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
