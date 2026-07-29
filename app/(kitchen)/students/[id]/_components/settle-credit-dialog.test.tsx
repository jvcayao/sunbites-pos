import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";

import { SettleCreditDialog } from "./settle-credit-dialog";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

function renderDialog(
  overrides: Partial<Parameters<typeof SettleCreditDialog>[0]> = {},
) {
  const onClose = jest.fn();

  render(
    <SettleCreditDialog
      open
      onClose={onClose}
      studentId={177}
      outstandingCredit={150}
      walletBalance={0}
      {...overrides}
    />,
  );

  return { onClose };
}

describe("SettleCreditDialog", () => {
  it("shows the outstanding credit and wallet balance", () => {
    renderDialog({ walletBalance: 500 });

    expect(screen.getByText("Outstanding Credit")).toBeInTheDocument();
    expect(screen.getByText("₱150.00")).toBeInTheDocument();
    expect(screen.getByText("Wallet Balance")).toBeInTheDocument();
    expect(screen.getByText("₱500.00")).toBeInTheDocument();
  });

  it("pre-fills the amount with the full outstanding credit", () => {
    renderDialog();

    expect(screen.getByLabelText("Amount (₱)")).toHaveValue(150);
  });

  it("projects the credit remaining after the entered amount", async () => {
    const user = userEvent.setup();
    renderDialog();

    const amount = screen.getByLabelText("Amount (₱)");
    await user.clear(amount);
    await user.type(amount, "40");

    expect(screen.getByText("Credit after settlement")).toBeInTheDocument();
    expect(screen.getByText("₱110.00")).toBeInTheDocument();
  });

  it("disables From Wallet when the wallet cannot cover the amount", () => {
    renderDialog({ walletBalance: 20 });

    expect(screen.getByRole("button", { name: "From Wallet" })).toBeDisabled();
    expect(screen.getByText(/From Wallet is unavailable/i)).toBeInTheDocument();
  });

  it("enables From Wallet once the wallet covers the amount", () => {
    renderDialog({ walletBalance: 500 });

    expect(screen.getByRole("button", { name: "From Wallet" })).toBeEnabled();
  });

  it("falls back off From Wallet when the amount rises past the balance", async () => {
    const user = userEvent.setup();
    renderDialog({ outstandingCredit: 150, walletBalance: 100 });

    const amount = screen.getByLabelText("Amount (₱)");
    await user.clear(amount);
    await user.type(amount, "50");

    const fromWallet = screen.getByRole("button", { name: "From Wallet" });
    await user.click(fromWallet);
    expect(fromWallet).toHaveAttribute("aria-pressed", "true");

    await user.clear(amount);
    await user.type(amount, "150");

    expect(fromWallet).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cash" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the reference field only for GCash and bank transfer", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.queryByLabelText("Reference Number")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "GCash" }));
    expect(screen.getByLabelText("Reference Number")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cash" }));
    expect(screen.queryByLabelText("Reference Number")).not.toBeInTheDocument();
  });

  it("rejects an amount above the outstanding credit without calling the API", async () => {
    const user = userEvent.setup();
    let called = false;

    server.use(
      http.post(`${API}/students/:id/credit/settle`, () => {
        called = true;

        return HttpResponse.json({}, { status: 200 });
      }),
    );

    renderDialog();

    const amount = screen.getByLabelText("Amount (₱)");
    await user.clear(amount);
    await user.type(amount, "200");
    await user.click(screen.getByRole("button", { name: /Settle ₱200.00/ }));

    expect(
      await screen.findByText(/exceeds outstanding credit of ₱150.00/i),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("requires a reference number for GCash", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "GCash" }));
    await user.click(screen.getByRole("button", { name: /Settle/ }));

    expect(
      await screen.findByText(/reference number is required/i),
    ).toBeInTheDocument();
  });

  it("submits a valid cash settlement and closes", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /Settle ₱150.00/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("surfaces an API error inline and keeps the dialog open", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API}/students/:id/credit/settle`, () =>
        HttpResponse.json(
          { message: "No outstanding credit to settle." },
          { status: 422 },
        ),
      ),
    );

    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: /Settle ₱150.00/ }));

    expect(
      await screen.findByText("No outstanding credit to settle."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("resets the amount to the full outstanding credit via Full amount", async () => {
    const user = userEvent.setup();
    renderDialog();

    const amount = screen.getByLabelText("Amount (₱)");
    await user.clear(amount);

    await user.click(screen.getByRole("button", { name: "Full amount" }));

    await waitFor(() => expect(amount).toHaveValue(150));
  });
});
