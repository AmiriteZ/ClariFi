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
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>("personal");
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(
    null,
  );
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load persistence logic could go here (e.g. remember last view)

  const refreshHouseholds = async () => {
    if (!user) {
      console.log("HouseholdContext: No user, skipping refresh");
      return;
    }
    try {
      console.log("HouseholdContext: Fetching households...");
      setIsLoading(true);
      const households = await getMyHouseholds();
      console.log("HouseholdContext: Fetched households:", households);
      setUserHouseholds(households);

      // If currently active household is no longer in list, reset
      if (activeHousehold) {
        const stillExists = households.find((h) => h.id === activeHousehold.id);
        if (!stillExists) {
          setActiveHousehold(null);
          setViewMode("personal");
        } else {
          // Update active household object with latest data
          setActiveHousehold(stillExists);
        }
      }
    } catch (err) {
      console.error("HouseholdContext: Failed to load households", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to be fully initialized and user to be present
    if (user && useAuthStore.getState().isInitialized) {
      void refreshHouseholds();
    } else if (!user && useAuthStore.getState().isInitialized) {
      // Clear data if user logs out
      setUserHouseholds([]);
      setActiveHousehold(null);
      setViewMode("personal");
    }
  }, [user]);

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
