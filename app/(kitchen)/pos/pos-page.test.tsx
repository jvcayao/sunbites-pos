import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { inventoryItemsFixture, posMenuItemsFixture } from "@/__tests__/mocks/handlers";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";

import PosPage from "./page";

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

const cashierUser = { ...adminUser, roles: ["cashier"] as string[] };
const supervisorUser = { ...adminUser, roles: ["supervisor"] as string[] };

beforeEach(() => {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({ user: adminUser, activeBranch: null } as AuthState)
  );
});

describe("PosPage", () => {
  it("renders four tabs", () => {
    render(<PosPage />);

    expect(screen.getByRole("tab", { name: "POS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Transaction History" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Menu Management" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Inventory" })).toBeInTheDocument();
  });

  it("POS tab shows placeholder message", () => {
    render(<PosPage />);

    expect(screen.getByText(/POS checkout will be available/i)).toBeInTheDocument();
  });

  it("shows menu items in Menu Mgmt tab for admin", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));

    expect(await screen.findByText("Subscription Meal Tray")).toBeInTheDocument();
    expect(screen.getByText("Snack A (Bread/Pastry)")).toBeInTheDocument();
  });

  it("shows inventory table in Inventory tab for admin", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Inventory" }));

    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Chicken")).toBeInTheDocument();
  });

  it("shows status badges in Inventory tab", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Inventory" }));

    await screen.findByText("Rice");

    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("cashier sees restricted message on Menu Mgmt tab", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({ user: cashierUser, activeBranch: null } as AuthState)
    );

    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));

    expect(screen.getByText(/Only admins and managers/i)).toBeInTheDocument();
  });

  it("cashier sees restricted message on Inventory tab", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({ user: cashierUser, activeBranch: null } as AuthState)
    );

    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Inventory" }));

    expect(screen.getByText(/You do not have access to inventory/i)).toBeInTheDocument();
  });

  it("supervisor can view inventory but not manage menu", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({ user: supervisorUser, activeBranch: null } as AuthState)
    );

    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));
    expect(screen.getByText(/Only admins and managers/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Inventory" }));
    expect(await screen.findByText("Rice")).toBeInTheDocument();
  });

  it("add item form validates missing fields", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));
    await screen.findByText("Subscription Meal Tray");

    await user.click(screen.getByRole("button", { name: /\+ Add Item/i }));

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
  });

  it("toggle calls API and refreshes list", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));
    await screen.findByText("Subscription Meal Tray");

    const toggleButtons = screen.getAllByRole("switch");
    await user.click(toggleButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Subscription Meal Tray")).toBeInTheDocument();
    });
  });

  it("opens adjustment modal on Adjust click", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Inventory" }));
    await screen.findByText("Rice");

    const adjustButtons = screen.getAllByRole("button", { name: /Adjust/i });
    await user.click(adjustButtons[0]);

    expect(await screen.findByText(/Adjust Stock/i)).toBeInTheDocument();
    expect(screen.getByText(/Current:/i)).toBeInTheDocument();
  });

  it("adjustment modal shows correct new total preview", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Inventory" }));
    await screen.findByText("Rice");

    await user.click(screen.getAllByRole("button", { name: /Adjust/i })[0]);
    await screen.findByText(/Adjust Stock/i);

    const qtyInput = screen.getByLabelText(/Quantity/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, "10");

    expect(screen.getByText(/60.00 kg/i)).toBeInTheDocument();
  });

  it("shows an error when API fails on menu items", async () => {
    server.use(
      http.get(`${API}/pos/menu-items`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    );

    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(screen.getByRole("tab", { name: "Menu Management" }));

    expect(await screen.findByText(/Failed to load menu items/i)).toBeInTheDocument();
  });
});
