import { useAuthStore } from "../../../store/auth.store";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { User, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../../components/theme-provider";

// Check if theme provider exists first?
// I'll assume standard Tailwind dark mode for now and just add a placeholder or simple toggle if I find the context.
// Actually, I haven't seen a theme provider in the file list. Layout.tsx has `dark:` classes but no clear toggle logic visible in the snippet I saw (Layout.tsx lines 1-152).
// I'll stick to a simple "Profile" section for now to make it functional.

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Settings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your account preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input defaultValue={user?.name || ""} disabled />
              <p className="text-xs text-neutral-500">
                Contact support to change your display name
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input defaultValue={user?.email || ""} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how ClariFi looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Theme</p>
                <p className="text-sm text-neutral-500">
                  Select your preferred theme
                </p>
              </div>
              <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("light")}
                  className={`h-8 w-8 p-0 ${
                    theme === "light"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className={`h-8 w-8 p-0 ${
                    theme === "dark"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("system")}
                  className={`h-8 w-8 p-0 ${
                    theme === "system"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
