import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/auth.store";
import { setOnboardingStatus } from "../../features/auth/api/auth.api";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

interface Step {
  title: string;
  description: string;
  targetId?: string;
  route?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const steps: Step[] = [
  {
    title: "Welcome to ClariFi!",
    description:
      "Welcome to your new financial command center! Let's take a tour of the key features to get you started.",
    position: "center",
    route: "/dashboard",
  },
  {
    title: "Overview Dashboard",
    description:
      "Your financial health at a glance. See your net worth, cash flow, and recent activity here.",
    position: "center",
    route: "/dashboard",
  },
  {
    title: "Quick Navigation",
    description:
      "Use the sidebar to jump between different sections of the app anytime.",
    targetId: "sidebar-nav",
    position: "right",
    route: "/dashboard",
  },
  {
    title: "Managing Transactions",
    description:
      "Track every dollar. You can categorize, search, and even hide personal transactions from your household here.",
    route: "/transactions",
    position: "center",
  },
  {
    title: "Smart Budgets",
    description:
      "Create and manage budgets to stay on track. We'll help you monitor your spending and save more.",
    route: "/budgets",
    position: "center",
  },
  {
    title: "Financial Goals",
    description:
      "Set targets for savings or big purchases. Track your progress and reach your milestones faster.",
    route: "/goals",
    position: "center",
  },
  {
    title: "AI Assistant",
    description:
      "Have questions about your finances? Ask our AI Assistant for personalized insights and advice.",
    route: "/assistant",
    position: "center",
  },
  {
    title: "Connected Accounts",
    description:
      "Link your bank accounts or add manual ones to keep all your finances in one place.",
    route: "/accounts",
    position: "center",
  },
  {
    title: "Household Collaboration",
    description:
      "Invite family members to manage shared finances together while keeping your personal data private.",
    route: "/households",
    position: "center",
  },
  {
    title: "Personal vs. Household",
    description:
      "Use this toggle to switch between your personal view and your shared household finances.",
    targetId: "mode-toggle",
    position: "bottom",
    route: "/households",
  },
  {
    title: "Keep it Fresh",
    description:
      "Click Resync anytime to pull the latest data from your connected banks.",
    targetId: "resync-button",
    position: "bottom",
    route: "/dashboard",
  },
  {
    title: "All Set!",
    description:
      "You're ready to master your finances with ClariFi. You can restart this tour anytime from Settings.",
    position: "center",
    route: "/dashboard",
  },
];

export function OnboardingGuide() {
  const { user, token, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation Effect: Only trigger navigation when the actual STEP changes
  useEffect(() => {
    const step = steps[currentStep];
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]); // Navigation only depends on currentStep

  // Spotlight Effect: Update position whenever step OR location changes
  useEffect(() => {
    const updateSpotlight = () => {
      const step = steps[currentStep];
      const targetId = step.targetId;
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          // Ensure element is visible before calculating rect
          if (windowWidth < 768) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          setTargetRect(el.getBoundingClientRect());
          return true;
        }
      }
      setTargetRect(null);
      return false;
    };

    // Initial check
    const found = updateSpotlight();

    // If element not found (page transition is in progress), retry for up to 2 seconds
    if (!found) {
      const interval = setInterval(() => {
        if (updateSpotlight()) {
          clearInterval(interval);
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [currentStep, location.pathname, windowWidth]);

  if (!user || user.hasOnboarded) return null;

  const handleFinish = async () => {
    if (token) {
      try {
        await setOnboardingStatus(token, true);
        login({ user: { ...user, hasOnboarded: true }, token });
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
      }
    }
  };

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight for Step */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute rounded-xl ring-[2000px] ring-black/40 shadow-[0_0_0_8px_rgba(16,185,129,0.3)] pointer-events-none z-50"
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          />
        )}
      </AnimatePresence>

      {/* Popover */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          left: targetRect ? "auto" : "50%",
          top: targetRect ? "auto" : "50%",
          transform: targetRect ? "none" : "translate(-50%, -50%)",
        }}
        className={cn(
          "absolute p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 w-[calc(100%-32px)] sm:w-full max-w-sm pointer-events-auto z-50 transition-all duration-300",
          targetRect ? "mt-4" : "",
        )}
        style={
          targetRect && windowWidth >= 768
            ? {
                top:
                  current.position === "bottom"
                    ? targetRect.bottom + 20
                    : current.position === "top"
                      ? targetRect.top - 200
                      : "50%",
                left:
                  current.position === "right"
                    ? targetRect.right + 20
                    : current.position === "left"
                      ? targetRect.left - 400
                      : "50%",
                transform:
                  current.position === "bottom" || current.position === "top"
                    ? "translateX(-50%)"
                    : "none",
              }
            : {
                top: targetRect ? targetRect.bottom + 20 : "50%",
                left: "50%",
                transform: "translate(-50%, 0)",
                ...(!targetRect && { transform: "translate(-50%, -50%)" }),
              }
        }
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
            {current.title}
          </h3>
          <button
            onClick={handleFinish}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-6 sm:mb-8 leading-relaxed">
          {current.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "bg-emerald-500 w-4"
                    : "bg-neutral-200 dark:bg-neutral-700",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="premium"
                size="sm"
                onClick={handleFinish}
                className="gap-2"
              >
                Get Started
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
