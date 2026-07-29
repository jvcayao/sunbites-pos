import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";

import { WalletTab } from "./wallet-tab";

import type { LedgerEntry } from "@/types/student";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

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
});
