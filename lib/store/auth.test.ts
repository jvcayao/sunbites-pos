import { act, renderHook } from "@testing-library/react";
import { useAuthStore } from "./auth";

import type { AuthUser, Branch } from "@/types/auth";

const mockUser: AuthUser = {
  id: 1,
  first_name: "Test",
  last_name: "Staff",
  full_name: "Test Staff",
  email: "staff@sunbites.test",
  roles: ["cashier"],
  branches: [{ id: 1, name: "Main", slug: "main" }],
};

const mockBranch: Branch = { id: 1, name: "Main", slug: "main" };

beforeEach(() => {
  act(() => {
    useAuthStore.getState().logout();
  });
});

describe("useAuthStore", () => {
  it("starts with null state", () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.activeBranch).toBeNull();
  });

  it("login() sets token, user, and clears activeBranch", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login("test-token", mockUser);
    });

    expect(result.current.token).toBe("test-token");
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.activeBranch).toBeNull();
  });

  it("logout() clears all state", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login("test-token", mockUser);
      result.current.setActiveBranch(mockBranch);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.activeBranch).toBeNull();
  });

  it("setActiveBranch() stores the selected branch", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login("test-token", mockUser);
      result.current.setActiveBranch(mockBranch);
    });

    expect(result.current.activeBranch).toEqual(mockBranch);
  });
});
