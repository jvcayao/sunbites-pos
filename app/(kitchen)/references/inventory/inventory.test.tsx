import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { inventoryLogsFixture } from "@/__tests__/mocks/handlers";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";

import ReferencesInventoryPage from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/lib/store/auth", () => {
  const actual = jest.requireActual("@/lib/store/auth") as typeof import("@/lib/store/auth");
  return {
    ...actual,
    useAuthStore: Object.assign(jest.fn(), {
      getState: actual.useAuthStore.getState,
      setState: actual.useAuthStore.setState,
    }),
  };
});

const mockUseAuthStore = jest.mocked(useAuthStore);

const adminUser = {
  id: 1,
  first_name: "Admin",
  last_name: "User",
  full_name: "Admin User",
  email: "admin@test.com",
  roles: ["admin"] as string[],
  branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
};

beforeEach(() => {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({ user: adminUser, activeBranch: null } as AuthState)
  );
});

// Register history handler for tests (returns empty list)
beforeEach(() => {
  server.use(
    http.get(`${API}/references/inventory/history`, () =>
      HttpResponse.json({ data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 25 } })
    )
  );
});

describe("ReferencesInventoryPage", () => {
  it("renders the Inventory heading", () => {
    render(<ReferencesInventoryPage />);

    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
  });

  it("renders inventory table with items", async () => {
    render(<ReferencesInventoryPage />);

    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Chicken")).toBeInTheDocument();
  });

  it("displays correct status badges", async () => {
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    // Status badges now show "OK ✓" and "LOW ⚠"
    expect(screen.getByText("OK ✓")).toBeInTheDocument();
    expect(screen.getByText("LOW ⚠")).toBeInTheDocument();
  });

  it("add item form validates missing fields", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getByRole("button", { name: /\+ Add/i }));

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
  });

  it("creates a new item and updates the list", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.type(screen.getByLabelText("Name *"), "Salt");
    await user.type(screen.getByLabelText("Initial Qty *"), "5");
    await user.type(screen.getByLabelText("Unit *"), "kg");
    await user.type(screen.getByLabelText("Low Alert Qty *"), "2");

    await user.click(screen.getByRole("button", { name: /\+ Add/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Adding…/i })).not.toBeInTheDocument();
    });
  });

  it("opens edit dialog with item data", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Edit/i })[0]);

    expect(await screen.findByRole("heading", { name: /Edit: Rice/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rice")).toBeInTheDocument();
  });

  it("opens history dialog with log history", async () => {
    server.use(
      http.get(`${API}/references/inventory/:id/logs`, () =>
        HttpResponse.json(inventoryLogsFixture)
      )
    );

    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    // Index 0 is the "History" tab button; per-item History buttons start at index 1
    await user.click(screen.getAllByRole("button", { name: /History/i })[1]);

    expect(await screen.findByText(/Stock History/i)).toBeInTheDocument();
    expect(await screen.findByText("Initial stock")).toBeInTheDocument();
  });

  it("delete shows confirm dialog", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Delete/i })[0]);

    expect(await screen.findByText(/Delete Inventory Item/i)).toBeInTheDocument();
  });

  it("shows 422 error message when item has logs and cannot be deleted", async () => {
    server.use(
      http.delete(`${API}/references/inventory/:id`, () =>
        HttpResponse.json(
          { message: "This item has adjustment history and cannot be deleted." },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Delete/i })[0]);
    await screen.findByText(/Delete Inventory Item/i);

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(
      await screen.findByText(/This item has adjustment history and cannot be deleted/i)
    ).toBeInTheDocument();
  });

  it("deletes item successfully when no logs exist", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Delete/i })[0]);
    await screen.findByText(/Delete Inventory Item/i);

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Delete Inventory Item/i)).not.toBeInTheDocument();
    });
  });

  it("shows error when API fails to load inventory", async () => {
    server.use(
      http.get(`${API}/references/inventory`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    );

    render(<ReferencesInventoryPage />);

    expect(await screen.findByText(/Failed to load inventory/i)).toBeInTheDocument();
  });
});
