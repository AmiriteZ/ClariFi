import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuthStore } from "./store/auth.store";
import { HouseholdProvider } from "./store/household.context";
import { fetchUserProfile } from "./features/auth/api/auth.api";

export default function App() {
  const { login, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          // Try to fetch the full profile from our backend
          const userProfile = await fetchUserProfile(token);

          login({
            user: userProfile,
            token,
          });
        } catch (err) {
          console.error(
            "Failed to fetch user profile, falling back to Firebase user:",
            err,
          );
          // Fallback if backend fetch fails
          const token = await user.getIdToken();
          login({
            user: {
              id: user.uid,
              name: user.displayName || "User",
              email: user.email || "",
            },
            token,
          });
        }
      } else {
        logout();
      }
      setInitialized(true);
    });

    return () => unsub();
  }, [login, logout, setInitialized]);

  return (
    <HouseholdProvider>
      <Outlet />
    </HouseholdProvider>
  );
}
