import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/auth.store";
import { setOnboardingStatus } from "../../features/auth/api/auth.api";

interface PersonaSelectionModalProps {
  onComplete: () => void;
}

export function PersonaSelectionModal({
  onComplete,
}: PersonaSelectionModalProps) {
  const { user, token, login } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPersona = async (
    persona: "student" | "professional" | "skip",
  ) => {
    if (!token || !user) return;

    setLoading(persona);
    setError(null);

    try {
      if (persona !== "skip") {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api"}/demo/setup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ persona }),
          },
        );

        if (!res.ok) throw new Error("Failed to setup demo data");
      }

      // Complete onboarding
      await setOnboardingStatus(token, true);
      login({ user: { ...user, hasOnboarded: true }, token });
      onComplete();
    } catch (err) {
      console.error(err);
      setError("Failed to initialize your account. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl overflow-hidden"
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-brand-500 via-emerald-500 to-sky-500" />

        <div className="p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              Choose your starting point
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              Select a persona to pre-fill ClariFi with realistic data, or start
              with a fresh, empty account.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            {/* Student Persona */}
            <button
              onClick={() => handleSelectPersona("student")}
              disabled={!!loading}
              className="group text-left"
            >
              <Card
                className={cn(
                  "h-full border-2 transition-all duration-300 hover:border-brand-500/50 hover:shadow-xl group-active:scale-[0.98]",
                  loading === "student"
                    ? "border-brand-500 ring-2 ring-brand-500/20"
                    : "border-transparent bg-neutral-50 dark:bg-neutral-800/50",
                )}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">University Student</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Dublin-based student with irregular tutoring income, €650
                    rent, and typical social expenses.
                  </p>
                  <div className="mt-6 flex items-center text-brand-600 dark:text-brand-400 font-medium text-sm">
                    {loading === "student" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <>
                        Select Persona{" "}
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>

            {/* Professional Persona */}
            <button
              onClick={() => handleSelectPersona("professional")}
              disabled={!!loading}
              className="group text-left"
            >
              <Card
                className={cn(
                  "h-full border-2 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl group-active:scale-[0.98]",
                  loading === "professional"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-transparent bg-neutral-50 dark:bg-neutral-800/50",
                )}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Young Professional</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Established graduate with a stable €3,500 salary, €2,100
                    rent, and adult monthly subscriptions.
                  </p>
                  <div className="mt-6 flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                    {loading === "professional" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <>
                        Select Persona{" "}
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => handleSelectPersona("skip")}
              disabled={!!loading}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-medium transition-colors p-2"
            >
              Skip and start with an empty account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
