import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { useAuthStore, type AuthState } from "@/lib/store/auth";

import { WalletTab } from "./wallet-tab";

import type { LedgerEntry } from "@/types/student";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

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

function mockUser(roles: string[]) {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: {
        id: 1,
        first_name: "Test",
        last_name: "Staff",
        full_name: "Test Staff",
        email: "staff@test.com",
        roles,
        branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
      },
      activeBranch: { id: 1, name: "Main Branch", slug: "main-branch" },
      token: "test-token",
    } as AuthState),
  );
}

const entries: LedgerEntry[] = [
  {
    id: "credit-9",
    date: "2026-07-23T10:01:00+08:00",
    entry_type: "credit_charged",
    entry_label: "Credit Charged",
    direction: "debit",
    amount: 25,
    payment_method: null,
    reference_number: null,
    note: "Credit used for order ANTIPOLO-2026-0412.",
    performed_by: "Maris Cayao",
    voided: false,
    wallet_transaction_id: null,
  },
  {
    id: "wallet-4",
    date: "2026-07-17T09:00:00+08:00",
    entry_type: "deposit",
    entry_label: "Top-up",
    direction: "credit",
    amount: 200,
    payment_method: null,
    reference_number: null,
    note: "cash",
    performed_by: "Maris Cayao",
    voided: false,
    wallet_transaction_id: 4,
  },
];

function ledgerResponse(data: LedgerEntry[], lastPage = 1) {
  return {
    data,
    meta: {
      current_page: 1,
      last_page: lastPage,
      per_page: 15,
      total: data.length,
      from: 1,
      to: data.length,
    },
  };
}

function renderTab(creditBalance = 150, walletBalance = 0) {
  const onTopUp = jest.fn();

  render(
    <WalletTab
      studentId={177}
      walletBalance={walletBalance}
      creditBalance={creditBalance}
      onTopUp={onTopUp}
    />,
  );

  return { onTopUp };
}

describe("WalletTab", () => {
  beforeEach(() => {
    mockUser(["admin"]);
    server.use(
      http.get(`${API}/students/:id/ledger`, () =>
        HttpResponse.json(ledgerResponse(entries)),
      ),
    );
  });

  it("renders both the wallet balance and the outstanding credit", async () => {
    renderTab(150, 0);

    expect(screen.getByText("Current Balance")).toBeInTheDocument();
    expect(screen.getByText("Outstanding Credit")).toBeInTheDocument();
    expect(screen.getByText("₱150.00")).toBeInTheDocument();
    expect(await screen.findByText("Credit Charged")).toBeInTheDocument();
  });

  it("offers Settle Credit only when credit is owed", async () => {
    renderTab(150);
    expect(
      await screen.findByRole("button", { name: "Settle Credit" }),
    ).toBeInTheDocument();
  });

  it("hides Settle Credit when nothing is owed", async () => {
    renderTab(0);

    await screen.findByText("Top-up");
    expect(
      screen.queryByRole("button", { name: "Settle Credit" }),
    ).not.toBeInTheDocument();
  });

  it("renders ledger rows with signed amounts and the staff name", async () => {
    renderTab();

    expect(await screen.findByText("−₱25.00")).toBeInTheDocument();
    expect(screen.getByText("+₱200.00")).toBeInTheDocument();
    expect(screen.getAllByText("Maris Cayao")).toHaveLength(2);
  });

  it("shows a loading skeleton while the ledger is fetching", () => {
    renderTab();

    expect(
      screen.getByRole("status", { name: "Loading transactions" }),
    ).toBeInTheDocument();
  });

  it("shows an error message when the ledger request fails", async () => {
    server.use(
      http.get(`${API}/students/:id/ledger`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    renderTab();

    expect(
      await screen.findByText("Failed to load transactions."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there is no activity", async () => {
    server.use(
      http.get(`${API}/students/:id/ledger`, () =>
        HttpResponse.json(ledgerResponse([])),
      ),
    );

    renderTab();

    expect(await screen.findByText("No transactions yet.")).toBeInTheDocument();
  });

  it("requests only credit entries when the Credit filter is chosen", async () => {
    const user = userEvent.setup();
    const requested: string[] = [];

    server.use(
      http.get(`${API}/students/:id/ledger`, ({ request }) => {
        requested.push(
          new URL(request.url).searchParams.get("entry_type") ?? "",
        );

        return HttpResponse.json(ledgerResponse([entries[0]]));
      }),
    );

    renderTab();
    await screen.findByText("Credit Charged");

    await user.click(screen.getByRole("button", { name: "Credit" }));

    await waitFor(() => expect(requested).toContain("credit"));
  });

  it("marks the active filter with aria-pressed", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Credit Charged");

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Top-up" }));

    expect(screen.getByRole("button", { name: "Top-up" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hides pagination on a single page and shows it across multiple", async () => {
    renderTab();
    await screen.findByText("Credit Charged");
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();

    server.use(
      http.get(`${API}/students/:id/ledger`, () =>
        HttpResponse.json(ledgerResponse(entries, 3)),
      ),
    );

    renderTab();

    expect(await screen.findByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("calls onTopUp when Top Up is pressed", async () => {
    const user = userEvent.setup();
    const { onTopUp } = renderTab();

    await user.click(screen.getByRole("button", { name: "+ Top Up" }));

    expect(onTopUp).toHaveBeenCalled();
  });

  it("renders a credit_charged row (including one sourced from a void's shortfall) with standard styling — no new rendering path is needed", async () => {
    renderTab();

    expect(await screen.findByText("Credit Charged")).toBeInTheDocument();
    expect(screen.getByText("−₱25.00")).toBeInTheDocument();
  });

  describe("Void action", () => {
    it("renders the Void action for an admin on a voidable deposit row", async () => {
      mockUser(["admin"]);
      renderTab();

      expect(
        await screen.findByRole("button", { name: "Void" }),
      ).toBeInTheDocument();
    });

    it("does not render the Void action for a cashier", async () => {
      mockUser(["cashier"]);
      renderTab();

      await screen.findByText("Top-up");
      expect(
        screen.queryByRole("button", { name: "Void" }),
      ).not.toBeInTheDocument();
    });

    it("does not render the Void action on a voided row, and shows a Voided badge instead", async () => {
      mockUser(["admin"]);
      server.use(
        http.get(`${API}/students/:id/ledger`, () =>
          HttpResponse.json(
            ledgerResponse([{ ...entries[1], voided: true }]),
          ),
        ),
      );

      renderTab();

      expect(await screen.findByText("Voided")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Void" }),
      ).not.toBeInTheDocument();
    });

    it("strikes through the amount on a voided row", async () => {
      mockUser(["admin"]);
      server.use(
        http.get(`${API}/students/:id/ledger`, () =>
          HttpResponse.json(
            ledgerResponse([{ ...entries[1], voided: true }]),
          ),
        ),
      );

      renderTab();

      expect(await screen.findByText("+₱200.00")).toHaveClass("line-through");
    });

    it("shows the Void action disabled with an explanatory title for a manager on a non-today row", async () => {
      mockUser(["manager"]);
      renderTab();

      const button = await screen.findByRole("button", { name: "Void" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute(
        "title",
        "Only an admin can void a top-up from a previous day.",
      );
    });

    it("does not disable the Void action for an admin on a non-today row", async () => {
      mockUser(["admin"]);
      renderTab();

      expect(await screen.findByRole("button", { name: "Void" })).toBeEnabled();
    });

    it("opens VoidTopUpDialog with the clicked row's data", async () => {
      mockUser(["admin"]);
      const user = userEvent.setup();
      renderTab();

      await user.click(await screen.findByRole("button", { name: "Void" }));

      expect(
        screen.getByText("Reverse a wallet top-up that was entered in error."),
      ).toBeInTheDocument();
      expect(screen.getByText("Original Amount")).toBeInTheDocument();
      expect(screen.getByText("₱200.00")).toBeInTheDocument();
    });
  });
});
