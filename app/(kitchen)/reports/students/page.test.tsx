import { http, HttpResponse } from "msw";
import React from "react";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { server } from "@/__tests__/mocks/server";
import { useAuthStore, type AuthState } from "@/lib/store/auth";
import type { StudentReportRow } from "@/lib/api/reports";

// ---------------------------------------------------------------------------
// Mock next/navigation (page doesn't use it but some deps might)
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/reports/students",
}));

// ---------------------------------------------------------------------------
// Mock shadcn Select — radix-ui portals don't work in jsdom
// ---------------------------------------------------------------------------

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label="Month select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

// ---------------------------------------------------------------------------
// Mock useAuthStore
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Import page (after mocks)
// ---------------------------------------------------------------------------

import StudentsReportPage from "./page";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptySummary = {
  total: 0,
  grade_breakdown: {},
  status_breakdown: {},
};

const baseReportResponse = {
  data: [],
  meta: {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  },
  summary: emptySummary,
};

const summaryWithTotal = {
  total: 5,
  grade_breakdown: { "Grade 3": 5 },
  status_breakdown: { enrolled: 5 },
};

const studentRowBase: StudentReportRow = {
  id: 1,
  full_name: "Maria Santos",
  student_number: "ANT-2026-001",
  grade_level: "Grade 3",
  section: "Section Mabini",
  status: "enrolled",
  wallet_balance: 450,
  total_spent: 0,
  notes: null,
  allergies: null,
  payment_history: null,
};

const subscriptionStudentRow = {
  ...studentRowBase,
  payment_history: [
    { month: "june",      month_label: "June",      year: 2026, status: "paid" as const },
    { month: "july",      month_label: "July",      year: 2026, status: "unpaid" as const },
    { month: "august",    month_label: "August",    year: 2026, status: "unpaid" as const },
    { month: "september", month_label: "September", year: 2026, status: "unpaid" as const },
    { month: "october",   month_label: "October",   year: 2026, status: "unpaid" as const },
    { month: "november",  month_label: "November",  year: 2026, status: "no_record" as const },
    { month: "december",  month_label: "December",  year: 2026, status: "no_record" as const },
    { month: "january",   month_label: "January",   year: 2026, status: "no_record" as const },
    { month: "february",  month_label: "February",  year: 2026, status: "no_record" as const },
    { month: "march",     month_label: "March",     year: 2026, status: "no_record" as const },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupEmptyReport() {
  server.use(
    http.get(`${API}/reports/students`, () =>
      HttpResponse.json(baseReportResponse),
    ),
  );
}

function setupReportWith(
  rows: StudentReportRow[],
  summary = summaryWithTotal,
) {
  server.use(
    http.get(`${API}/reports/students`, () =>
      HttpResponse.json({
        data: rows,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: rows.length,
        },
        summary,
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: adminUser,
      activeBranch: { id: 1, name: "Main Branch", slug: "main-branch" },
      token: "test-token",
      login: jest.fn(),
      logout: jest.fn(),
      setActiveBranch: jest.fn(),
    } as AuthState),
  );

  // Default: empty report
  setupEmptyReport();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StudentsReportPage", () => {
  it("renders the page heading", async () => {
    render(<StudentsReportPage />);
    expect(await screen.findByText("Student Report")).toBeInTheDocument();
  });

  it("shows Export to Excel button for admin users", async () => {
    render(<StudentsReportPage />);
    expect(
      await screen.findByRole("button", { name: /export to excel/i }),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Subscription pills hidden for non-subscription type
  // ---------------------------------------------------------------------------

  it("does not show Payment pill group by default (no type selected)", async () => {
    render(<StudentsReportPage />);
    // Wait for the page to settle — the Type pill group must be visible
    expect(await screen.findByText("Type")).toBeInTheDocument();
    expect(screen.queryByText("Payment")).not.toBeInTheDocument();
  });

  it("shows Payment pill group only after Subscription type pill is clicked", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    // Wait for the Type pill group to render
    expect(await screen.findByText("Type")).toBeInTheDocument();
    expect(screen.queryByText("Payment")).not.toBeInTheDocument();

    // Click the "Subscription" type pill
    await user.click(screen.getByRole("button", { name: "Subscription" }));

    // Payment pill group label should now appear
    expect(await screen.findByText("Payment")).toBeInTheDocument();
  });

  it("hides Payment pill group when Non-Subscription type is selected", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");

    // First select Subscription (shows Payment group)
    await user.click(screen.getByRole("button", { name: "Subscription" }));
    expect(await screen.findByText("Payment")).toBeInTheDocument();

    // Then switch to Non-Subscription
    await user.click(screen.getByRole("button", { name: "Non-Subscription" }));

    await waitFor(() => {
      expect(screen.queryByText("Payment")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Month range selectors appear when payment pill active
  // ---------------------------------------------------------------------------

  it("does not show month From/To selects until a payment status pill is clicked", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");

    // Select Subscription to reveal Payment filter
    await user.click(screen.getByRole("button", { name: "Subscription" }));
    await screen.findByText("Payment");

    // From / To selects should NOT be present yet
    expect(screen.queryByText("From")).not.toBeInTheDocument();
    expect(screen.queryByText("To")).not.toBeInTheDocument();
  });

  it("shows From and To month selects after a payment status pill is clicked", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");
    await user.click(screen.getByRole("button", { name: "Subscription" }));
    await screen.findByText("Payment");

    // Click the "Paid" payment pill
    await user.click(screen.getByRole("button", { name: "Paid" }));

    // From and To labels should now appear
    expect(await screen.findByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
  });

  it("hides From/To selects when payment pill is de-selected", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");
    await user.click(screen.getByRole("button", { name: "Subscription" }));
    await screen.findByText("Payment");

    // Activate payment filter
    await user.click(screen.getByRole("button", { name: "Paid" }));
    await screen.findByText("From");

    // Toggle Paid off (same button, same value → deselects)
    await user.click(screen.getByRole("button", { name: "Paid" }));

    await waitFor(() => {
      expect(screen.queryByText("From")).not.toBeInTheDocument();
      expect(screen.queryByText("To")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Clear all button appears when filter active and resets state
  // ---------------------------------------------------------------------------

  it("does not show Clear filters button when no filters are active", async () => {
    render(<StudentsReportPage />);
    // Wait for pill groups to render (Type is unique — not a column header)
    await screen.findByText("Type");
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Clear filters button after a status pill is clicked", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");
    await user.click(screen.getByRole("button", { name: "Enrolled" }));

    expect(
      await screen.findByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("clicking Clear filters removes the button and resets pill selection", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");
    await user.click(screen.getByRole("button", { name: "Enrolled" }));

    const clearBtn = await screen.findByRole("button", { name: /clear filters/i });
    await user.click(clearBtn);

    // Clear filters button should disappear
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /clear filters/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("Clear filters also hides Payment filter when subscription was selected", async () => {
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Type");
    await user.click(screen.getByRole("button", { name: "Subscription" }));
    await screen.findByText("Payment");
    await user.click(screen.getByRole("button", { name: "Paid" }));
    await screen.findByText("From");

    await user.click(
      screen.getByRole("button", { name: /clear filters/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Payment")).not.toBeInTheDocument();
      expect(screen.queryByText("From")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Card label adapts to filters
  // ---------------------------------------------------------------------------

  it("shows 'Total Enrolled' card label when no filters are active", async () => {
    setupReportWith([studentRowBase], summaryWithTotal);
    render(<StudentsReportPage />);

    expect(await screen.findByText("Total Enrolled")).toBeInTheDocument();
  });

  it("shows 'Matching Students' card label when a filter is applied", async () => {
    setupReportWith([studentRowBase], summaryWithTotal);
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    // Wait for summary card to render
    await screen.findByText("Total Enrolled");

    // Apply a status filter
    await user.click(screen.getByRole("button", { name: "Enrolled" }));

    expect(await screen.findByText("Matching Students")).toBeInTheDocument();
    expect(screen.queryByText("Total Enrolled")).not.toBeInTheDocument();
  });

  it("reverts card label back to 'Total Enrolled' after clearing filters", async () => {
    setupReportWith([studentRowBase], summaryWithTotal);
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    await screen.findByText("Total Enrolled");
    await user.click(screen.getByRole("button", { name: "Enrolled" }));
    await screen.findByText("Matching Students");

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(await screen.findByText("Total Enrolled")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 5: Payment history pills render for subscription students
  // ---------------------------------------------------------------------------

  it("shows 'Payment History' section and month pills when subscription row is expanded", async () => {
    setupReportWith([subscriptionStudentRow], summaryWithTotal);
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    // Wait for the row to appear
    const row = await screen.findByText("Maria Santos");

    // Click the row to expand it
    await user.click(row);

    // Payment History heading should appear
    expect(
      await screen.findByText("Payment History"),
    ).toBeInTheDocument();

    // The month labels are truncated to 3 chars — "Jun" from "June"
    expect(screen.getByText("Jun")).toBeInTheDocument();
    // A few more month abbreviations
    expect(screen.getByText("Jul")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });

  it("does not show Payment History section for students with null payment_history", async () => {
    setupReportWith([{ ...studentRowBase, payment_history: null }]);
    const user = userEvent.setup();
    render(<StudentsReportPage />);

    const row = await screen.findByText("Maria Santos");
    await user.click(row);

    await waitFor(() => {
      expect(screen.queryByText("Payment History")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it("shows error message when the API fails", async () => {
    server.use(
      http.get(`${API}/reports/students`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );
    render(<StudentsReportPage />);

    expect(
      await screen.findByText(/failed to load student data/i),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it("shows empty state message when no students match filters", async () => {
    render(<StudentsReportPage />);
    expect(
      await screen.findByText(/no students found for the selected filters/i),
    ).toBeInTheDocument();
  });
});
