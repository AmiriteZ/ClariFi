import { cn } from "../../lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PiggyBank,
  Target,
  Bot,
  CreditCard,
  Settings,
  LogOut,
  X,
  Building2,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Budgets", href: "/budgets", icon: PiggyBank },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "AI Assistant", href: "/assistant", icon: Bot },
  { name: "Accounts", href: "/accounts", icon: CreditCard },
  { name: "Households", href: "/households", icon: Building2 },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-300 transform xl:translate-x-0 xl:sticky xl:top-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              ClariFi
            </span>
            <button
              onClick={onClose}
              className="xl:hidden p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => window.innerWidth < 1280 && onClose()}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300",
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <Link
              to="/settings"
              onClick={() => window.innerWidth < 1280 && onClose()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" />
              Settings
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
