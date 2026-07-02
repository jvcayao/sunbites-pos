import { act, render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

import { BranchCacheSync } from "./branch-cache-sync";

import type { AuthUser, Branch } from "@/types/auth";

const API = process.env.NEXT_PUBLIC_API_URL;
const branchA: Branch = { id: 1, name: "Antipolo", slug: "antipolo" };
const branchB: Branch = { id: 2, name: "Iloilo", slug: "iloilo" };
const user: AuthUser = {
  id: 1,
  first_name: "Test",
  last_name: "Admin",
  full_name: "Test Admin",
  email: "admin@sunbites.test",
  roles: ["admin"],
  branches: [branchA, branchB],
};

// Echo the active branch header so we can prove which branch the data came from.
function useProbe() {
  return useQuery({
    queryKey: ["probe"],
    queryFn: () => apiClient.get<{ branch: string | null }>("/probe"),
  });
}

function Probe() {
  const { data } = useProbe();
  return <div>branch:{data?.branch ?? "none"}</div>;
}

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <BranchCacheSync />
      <Probe />
    </QueryClientProvider>,
  );
  return { queryClient, ...utils };
}

beforeEach(() => {
  server.use(
    http.get(`${API}/probe`, ({ request }) =>
      HttpResponse.json({ branch: request.headers.get("X-Branch-Id") }),
    ),
  );
  act(() => {
    useAuthStore.getState().logout();
  });
});

describe("BranchCacheSync", () => {
  it("refetches with the new branch when the active branch switches", async () => {
    act(() => {
      useAuthStore.getState().login("token", user);
      useAuthStore.getState().setActiveBranch(branchA);
    });

    renderWithClient();
    expect(await screen.findByText("branch:1")).toBeInTheDocument();

    act(() => {
      useAuthStore.getState().setActiveBranch(branchB);
    });

    expect(await screen.findByText("branch:2")).toBeInTheDocument();
  });

  it("does not reset on first branch selection (null -> B)", async () => {
    act(() => {
      useAuthStore.getState().login("token", user); // activeBranch = null
    });

    const { queryClient } = renderWithClient();
    const resetSpy = jest.spyOn(queryClient, "resetQueries");
    await screen.findByText("branch:none");

    act(() => {
      useAuthStore.getState().setActiveBranch(branchA);
    });

    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("clears the cache on logout (B -> null) using clear(), not resetQueries()", async () => {
    act(() => {
      useAuthStore.getState().login("token", user);
      useAuthStore.getState().setActiveBranch(branchA);
    });

    const { queryClient } = renderWithClient();
    await screen.findByText("branch:1");

    const clearSpy = jest.spyOn(queryClient, "clear");
    const resetSpy = jest.spyOn(queryClient, "resetQueries");

    act(() => {
      useAuthStore.getState().logout(); // activeBranch -> null
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["probe"])).toBeUndefined();
  });
});
