import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { inventoryItemsFixture, inventoryLogsFixture } from "@/__tests__/mocks/handlers";
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

describe("ReferencesInventoryPage", () => {
  it("renders the Inventory heading", () => {
    render(<ReferencesInventoryPage />);

    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("renders inventory table with items", async () => {
    render(<ReferencesInventoryPage />);

    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Chicken")).toBeInTheDocument();
  });

  it("displays correct status badges", async () => {
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText("Item Name"), "Salt");
    await user.type(screen.getByLabelText("Initial Qty"), "5");
    await user.type(screen.getByLabelText("Unit"), "kg");
    await user.type(screen.getByLabelText("Threshold"), "2");

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

    expect(await screen.findByRole("heading", { name: /Edit Item/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rice")).toBeInTheDocument();
  });

  it("opens logs dialog with log history", async () => {
    const user = userEvent.setup();
    render(<ReferencesInventoryPage />);

    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Logs/i })[0]);

    expect(await screen.findByText(/Adjustment Logs/i)).toBeInTheDocument();
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
