import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  type Household,
  getMyHouseholds,
} from "../features/households/api/households.api";
import { useAuthStore } from "./auth.store";

type ViewMode = "personal" | "household";

interface HouseholdContextType {
  viewMode: ViewMode;
  activeHousehold: Household | null;
  userHouseholds: Household[];
  isLoading: boolean;
  toggleView: () => void;
  setActiveHousehold: (household: Household | null) => void;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(
  undefined,
);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>("personal");
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(
    null,
  );
  // ... (rest of state)

  // ... (refreshHouseholds function)

  useEffect(() => {
    // Wait for auth to be fully initialized and user to be present
    if (user && isInitialized) {
      void refreshHouseholds();
    } else if (!user && isInitialized) {
      // Clear data if user logs out
      setUserHouseholds([]);
      setActiveHousehold(null);
      setViewMode("personal");
    }
  }, [user, isInitialized]);

  const toggleView = () => {
    if (viewMode === "personal") {
      // Switch to household
      // If we have households, pick the first one by default if none selected
      if (userHouseholds.length > 0 && !activeHousehold) {
        setActiveHousehold(userHouseholds[0]);
        setViewMode("household");
      } else if (activeHousehold) {
        setViewMode("household");
      } else {
        // No households to switch to - maybe prompt to create?
        // For now, just stay personal or handle in UI
        console.warn("No household to switch to");
      }
    } else {
      setViewMode("personal");
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        viewMode,
        activeHousehold,
        userHouseholds,
        isLoading,
        toggleView,
        setActiveHousehold,
        refreshHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return context;
}
