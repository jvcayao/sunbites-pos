import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser, Branch } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  activeBranch: Branch | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setActiveBranch: (branch: Branch) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeBranch: null,
      login: (token, user) => set({ token, user, activeBranch: null }),
      logout: () => set({ token: null, user: null, activeBranch: null }),
      setActiveBranch: (branch) => set({ activeBranch: branch }),
    }),
    {
      name: "sunbites-pos-auth",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
