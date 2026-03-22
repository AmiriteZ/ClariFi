import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { Menu, RefreshCw, Users, Settings, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ScreenOrientationLock } from "./ScreenOrientationLock";
import { useAuthStore } from "../../store/auth.store";
import { useHousehold } from "../../store/household.context";
import { resyncAllAccounts } from "../../features/accounts/api/bankConnections.api";
import { OnboardingGuide } from "../common/OnboardingGuide";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useAuthStore();
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

  const renderProfileDropdown = () =>
    isDropdownOpen && (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg z-50 py-1 origin-top-right animate-in fade-in zoom-in-95">
          <Link
            to="/settings"
            onClick={() => setIsDropdownOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={() => {
              setIsDropdownOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </>
    );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex transition-colors duration-300">
      <OnboardingGuide />
      <ScreenOrientationLock />
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 xl:ml-0 transition-margin duration-300">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 xl:hidden h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button
              id="mobile-menu-btn"
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
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            >
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
            </button>
            {renderProfileDropdown()}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden xl:flex sticky top-0 z-20 h-16 items-center justify-between px-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            {/* Household Context Switcher */}
            {viewMode && (
              <div
                id="mode-toggle"
                className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg"
              >
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
              id="resync-button"
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
            {/* User Avatar (Desktop) */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900 shadow-sm focus:outline-none focus:ring-brand-500 transition-shadow block"
              >
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
              </button>
              {renderProfileDropdown()}
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
