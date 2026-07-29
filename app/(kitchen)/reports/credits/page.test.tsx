import { http, HttpResponse } from "msw";
import React from "react";

import { render, screen } from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";
import { useAuthStore } from "@/lib/store/auth";

import type { CreditRow, CreditSummary } from "@/lib/api/reports";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/reports/credits",
}));

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
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
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

import CreditsReportPage from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

const rows: CreditRow[] = [
  {
    id: 1,
    created_at: "2026-07-29 14:14:00",
    student: {
      id: 177,
      full_name: "Lily Cielo",
      student_number: "SB-0001",
      grade_level: "Grade 4",
    },
    type: "settled",
    amount: 150,
    payment_method: "cash",
    payment_method_label: "Cash",
    reference_number: null,
    notes: "Paid by mother at counter",
    performed_by: "Maris Cayao",
  },
  {
    id: 2,
    created_at: "2026-07-28 10:01:00",
    student: {
      id: 177,
      full_name: "Lily Cielo",
      student_number: "SB-0001",
      grade_level: "Grade 4",
    },
    type: "waived",
    amount: 25,
    payment_method: null,
    payment_method_label: null,
    reference_number: null,
    notes: "Written off after graduation.",
    performed_by: "Gang Cayao",
  },
];

const summary: CreditSummary = {
  total_charged: 580,
  total_settled: 150,
  total_waived: 25,
  total_voided: 0,
  net_outstanding: 405,
  settled_by_method: {
    cash: 100,
    gcash: 50,
    bank_transfer: 0,
    wallet: 0,
  },
  settled_bringing_in_cash: 150,
};

describe("CreditsReportPage", () => {
  beforeEach(() => {
    mockUseAuthStore.mockImplementation((selector: unknown) =>
      typeof selector === "function"
        ? (selector as (s: unknown) => unknown)({
            user: adminUser,
            token: "t",
            activeBranchId: 1,
          })
        : undefined,
    );

    server.use(
      http.get(`${API}/reports/credits`, () =>
        HttpResponse.json({
          data: rows,
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: rows.length,
            from: 1,
            to: rows.length,
          },
          summary,
        }),
      ),
    );
  });

  it("renders the staff name as text, never 'undefined undefined'", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText("Maris Cayao")).toBeInTheDocument();
    expect(screen.getByText("Gang Cayao")).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it("renders the Total Waived summary card", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText("Total Waived")).toBeInTheDocument();
  });

  it("breaks settlements down by payment method", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText("Settled by method")).toBeInTheDocument();
    expect(screen.getByText(/Cash collected/)).toBeInTheDocument();
  });

  it("marks wallet settlements as bringing in no cash", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText(/From wallet/)).toBeInTheDocument();
    expect(screen.getByText("(no cash)")).toBeInTheDocument();
  });

  it("renders a waived row with its own badge and no payment method", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText("waived")).toBeInTheDocument();
    expect(screen.getByText("settled")).toBeInTheDocument();
  });

  it("shows net outstanding after subtracting waived amounts", async () => {
    render(<CreditsReportPage />);

    expect(await screen.findByText("Net Outstanding")).toBeInTheDocument();
    expect(screen.getByText("₱405.00")).toBeInTheDocument();
  });
});
