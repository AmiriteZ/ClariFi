import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuthStore } from "./store/auth.store";

export default function App() {
  const { login, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        login({
          user: {
            id: user.uid,
            name: user.displayName || "User",
            email: user.email || "",
          },
          token,
        });
      } else {
        logout();
      }
      setInitialized(true);
    });

    return () => unsub();
  }, [login, logout, setInitialized]);

  return <Outlet />;
}
