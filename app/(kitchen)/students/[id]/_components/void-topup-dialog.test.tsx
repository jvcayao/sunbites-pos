import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";

import { VoidTopUpDialog } from "./void-topup-dialog";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

function renderDialog(
  overrides: Partial<Parameters<typeof VoidTopUpDialog>[0]> = {},
) {
  const onClose = jest.fn();

  render(
    <VoidTopUpDialog
      open
      onClose={onClose}
      studentId={177}
      walletTransactionId={42}
      originalAmount={500}
      currentWalletBalance={500}
      {...overrides}
    />,
  );

  return { onClose };
}

describe("VoidTopUpDialog", () => {
  it("shows the original amount and current wallet balance", () => {
    renderDialog({ originalAmount: 500, currentWalletBalance: 300 });

    expect(screen.getByText("Original Amount")).toBeInTheDocument();
    expect(screen.getByText("₱500.00")).toBeInTheDocument();
    expect(screen.getByText("Current Wallet Balance")).toBeInTheDocument();
    expect(screen.getByText("₱300.00")).toBeInTheDocument();
  });

  it("shows the already-spent warning only when the wallet balance is short", () => {
    renderDialog({ originalAmount: 500, currentWalletBalance: 300 });

    expect(
      screen.getByText(/₱200\.00 of this top-up has already been spent/i),
    ).toBeInTheDocument();
  });

  it("does not show the already-spent warning when the full amount is recoverable", () => {
    renderDialog({ originalAmount: 500, currentWalletBalance: 500 });

    expect(
      screen.queryByText(/has already been spent/i),
    ).not.toBeInTheDocument();
  });

  it("does not show the already-spent warning when the wallet balance exceeds the original amount", () => {
    renderDialog({ originalAmount: 500, currentWalletBalance: 900 });

    expect(
      screen.queryByText(/has already been spent/i),
    ).not.toBeInTheDocument();
  });

  it("rejects an empty reason without calling the API", async () => {
    const user = userEvent.setup();
    let called = false;

    server.use(
      http.post(
        `${API}/students/:id/wallet/top-ups/:transactionId/void`,
        () => {
          called = true;

          return HttpResponse.json({}, { status: 200 });
        },
      ),
    );

    renderDialog();

    await user.click(screen.getByRole("button", { name: "Void Top-Up" }));

    expect(
      await screen.findByText("A reason is required"),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("rejects a reason over 500 characters without calling the API", async () => {
    const user = userEvent.setup();
    let called = false;

    server.use(
      http.post(
        `${API}/students/:id/wallet/top-ups/:transactionId/void`,
        () => {
          called = true;

          return HttpResponse.json({}, { status: 200 });
        },
      ),
    );

    renderDialog();

    await user.type(screen.getByLabelText("Reason"), "a".repeat(501));
    await user.click(screen.getByRole("button", { name: "Void Top-Up" }));

    expect(
      await screen.findByText("Reason must be 500 characters or fewer"),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("submits a valid void and closes, invalidating the student and ledger caches", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.type(
      screen.getByLabelText("Reason"),
      "Cashier entered the wrong amount.",
    );
    await user.click(screen.getByRole("button", { name: "Void Top-Up" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("surfaces a server error inline and keeps the dialog open", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        `${API}/students/:id/wallet/top-ups/:transactionId/void`,
        () =>
          HttpResponse.json(
            {
              message:
                "You cannot void a top-up you performed yourself. Ask another admin, manager, or supervisor to void it.",
            },
            { status: 403 },
          ),
      ),
    );

    const { onClose } = renderDialog();

    await user.type(screen.getByLabelText("Reason"), "Self-void attempt.");
    await user.click(screen.getByRole("button", { name: "Void Top-Up" }));

    expect(
      await screen.findByText(/cannot void a top-up you performed yourself/i),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables the submit button while the mutation is pending", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        `${API}/students/:id/wallet/top-ups/:transactionId/void`,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));

          return HttpResponse.json({
            message: "Top-up voided successfully.",
            voided_amount: 500,
            shortfall_amount: 0,
            new_wallet_balance: 0,
            new_credit_balance: 0,
          });
        },
      ),
    );

    renderDialog();

    await user.type(screen.getByLabelText("Reason"), "Pending state check.");
    const submitButton = screen.getByRole("button", { name: "Void Top-Up" });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: /Processing/ })).toBeDisabled();
  });
});
