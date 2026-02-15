// client/src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: string; // UUID
  name: string;
  email: string;
  photoUrl?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (p: { user: User; token: string }) => void;
  logout: () => void;
  setInitialized: (val: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isInitialized: false,
      login: ({ user, token }) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setInitialized: (val) => set({ isInitialized: val }),
    }),
    {
      name: "clarifi_auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        // Exclude isInitialized - it should always start as false on page load
      }),
    },
  ),
);
