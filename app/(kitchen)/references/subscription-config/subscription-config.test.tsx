import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { systemConfigsFixture } from "@/__tests__/mocks/handlers";

import { render, screen, fireEvent } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";

import SubscriptionConfigPage from "./page";

import type { BranchMonthlyAmountConfig } from "@/types/student";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("@/lib/store/auth", () => {
  const actual = jest.requireActual(
    "@/lib/store/auth",
  ) as typeof import("@/lib/store/auth");
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

const branchMonthlyAmountsFixture: BranchMonthlyAmountConfig[] = [
  {
    id: 1,
    school_month: "june",
    label: "June",
    year: 2026,
    days: 22,
    amount: 2970,
    is_configured: true,
  },
  {
    id: null,
    school_month: "july",
    label: "July",
    year: 2026,
    days: 22,
    amount: 2970,
    is_configured: false,
  },
];

function setupAdminAuth() {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: adminUser,
      activeBranch: null,
    } as AuthState),
  );
}

beforeEach(() => {
  setupAdminAuth();
  server.use(
    http.get(`${API}/pos/subscription-config`, () =>
      HttpResponse.json({
        meal_daily_limit: 1,
        snack_daily_limit: 1,
        drink_daily_limit: 1,
        extra_daily_limit: 1,
      }),
    ),
    http.get(`${API}/system-configurations`, () =>
      HttpResponse.json(systemConfigsFixture),
    ),
    http.get(`${API}/branch-monthly-amounts`, () =>
      HttpResponse.json(branchMonthlyAmountsFixture),
    ),
    http.post(`${API}/branch-monthly-amounts`, () =>
      HttpResponse.json({ ...branchMonthlyAmountsFixture[0] }, { status: 201 }),
    ),
    http.put(`${API}/branch-monthly-amounts/:id`, () =>
      HttpResponse.json({ ...branchMonthlyAmountsFixture[0] }),
    ),
  );
});

// ---------------------------------------------------------------------------
// Helper: open the Edit dialog for June
// ---------------------------------------------------------------------------

async function openEditDialog() {
  const user = userEvent.setup();
  render(<SubscriptionConfigPage />);

  // Wait for the table to load then click the Edit button for June
  const editButtons = await screen.findAllByRole("button", { name: /^edit$/i });
  await user.click(editButtons[0]);

  return user;
}

// ---------------------------------------------------------------------------
// Tests: School Days input minimum value
// ---------------------------------------------------------------------------

describe("EditDaysDialog — school days input", () => {
  it("accepts 0 as a valid school days value", async () => {
    const user = await openEditDialog();

    const daysInput = screen.getByLabelText(/school days/i);
    await user.clear(daysInput);
    await user.type(daysInput, "0");

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveButton);

    // No validation error about days range should appear
    expect(screen.queryByText(/days must be between/i)).not.toBeInTheDocument();
  });

  it("rejects negative days with a validation error", async () => {
    const user = await openEditDialog();

    // fireEvent.change bypasses the browser's number input sanitisation in jsdom,
    // allowing us to test the JS validation guard for values below 0.
    const daysInput = screen.getByLabelText(/school days/i);
    fireEvent.change(daysInput, { target: { value: "-1" } });

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveButton);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /days must be between 0 and 31/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Amount Override field disabled when days = 0
// ---------------------------------------------------------------------------

describe("EditDaysDialog — amount override when days = 0", () => {
  it("disables the amount override input when days is set to 0", async () => {
    const user = await openEditDialog();

    const daysInput = screen.getByLabelText(/school days/i);
    await user.clear(daysInput);
    await user.type(daysInput, "0");

    const overrideInput = screen.getByLabelText(/amount override/i);
    expect(overrideInput).toBeDisabled();
  });

  it("shows no-charge helper text when days is 0", async () => {
    const user = await openEditDialog();

    const daysInput = screen.getByLabelText(/school days/i);
    await user.clear(daysInput);
    await user.type(daysInput, "0");

    expect(
      screen.getByText(/no charge.*month has no school activity/i),
    ).toBeInTheDocument();
  });

  it("shows computed amount as ₱0 with a no-charge label when days is 0", async () => {
    const user = await openEditDialog();

    const daysInput = screen.getByLabelText(/school days/i);
    await user.clear(daysInput);
    await user.type(daysInput, "0");

    // The computed amount preview should show ₱0 and a "(no charge)" label
    expect(screen.getByText("(no charge)")).toBeInTheDocument();
  });

  it("re-enables the amount override input when days is changed back above 0", async () => {
    const user = await openEditDialog();

    const daysInput = screen.getByLabelText(/school days/i);

    // Set to 0 — override should disable
    await user.clear(daysInput);
    await user.type(daysInput, "0");
    expect(screen.getByLabelText(/amount override/i)).toBeDisabled();

    // Change back to a positive value — override should re-enable
    await user.clear(daysInput);
    await user.type(daysInput, "22");
    expect(screen.getByLabelText(/amount override/i)).toBeEnabled();
  });
});
