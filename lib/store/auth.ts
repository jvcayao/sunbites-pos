import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser, Branch } from "@/types/auth";

export interface AuthState {
  /**
   * The Sanctum bearer token. Kept in-memory only — never persisted to
   * localStorage or sessionStorage — to prevent XSS exfiltration.
   *
   * Non-sensitive session metadata (user profile, active branch) is
   * persisted to sessionStorage so the UI can restore it on refresh without
   * requiring a full re-login. The token itself is intentionally excluded
   * from the persisted subset via the `partialize` option.
   */
  token: string | null;
  user: AuthUser | null;
  activeBranch: Branch | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setActiveBranch: (branch: Branch | null) => void;
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        activeBranch: state.activeBranch,
      }),
    }
  )
);
