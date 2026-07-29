import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";

import { WaiveCreditDialog } from "./waive-credit-dialog";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";

function renderDialog(outstandingCredit = 150) {
  const onClose = jest.fn();

  render(
    <WaiveCreditDialog
      open
      onClose={onClose}
      studentId={177}
      outstandingCredit={outstandingCredit}
    />,
  );

  return { onClose };
}

describe("WaiveCreditDialog", () => {
  it("warns that the amount will not be collected", () => {
    renderDialog();

    expect(screen.getByText("This writes off money owed.")).toBeInTheDocument();
    expect(
      screen.getByText(/will not appear as cash received/i),
    ).toBeInTheDocument();
  });

  it("pre-fills the amount with the full outstanding credit", () => {
    renderDialog();

    expect(screen.getByLabelText("Amount to waive (₱)")).toHaveValue(150);
  });

  it("rejects a submission with no reason and does not call the API", async () => {
    const user = userEvent.setup();
    let called = false;

    server.use(
      http.post(`${API}/students/:id/credit/waive`, () => {
        called = true;

        return HttpResponse.json({}, { status: 200 });
      }),
    );

    renderDialog();

    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    expect(
      await screen.findByText(/at least 5 characters/i),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("rejects a reason shorter than five characters", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Reason"), "nope");
    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    expect(
      await screen.findByText(/at least 5 characters/i),
    ).toBeInTheDocument();
  });

  it("rejects an amount above the outstanding credit", async () => {
    const user = userEvent.setup();
    renderDialog();

    const amount = screen.getByLabelText("Amount to waive (₱)");
    await user.clear(amount);
    await user.type(amount, "500");
    await user.type(
      screen.getByLabelText("Reason"),
      "Graduated; written off per approval.",
    );
    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    expect(
      await screen.findByText(/exceeds outstanding credit of ₱150.00/i),
    ).toBeInTheDocument();
  });

  it("submits a valid waive and closes", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.type(
      screen.getByLabelText("Reason"),
      "Graduated; written off per approval.",
    );
    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("surfaces an API error and keeps the dialog open", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API}/students/:id/credit/waive`, () =>
        HttpResponse.json({ message: "Forbidden." }, { status: 403 }),
      ),
    );

    const { onClose } = renderDialog();

    await user.type(
      screen.getByLabelText("Reason"),
      "Graduated; written off per approval.",
    );
    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    expect(await screen.findByText("Forbidden.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables the confirm control while the waive is in flight", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API}/students/:id/credit/waive`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));

        return HttpResponse.json({ message: "Credit waived." });
      }),
    );

    renderDialog();

    await user.type(
      screen.getByLabelText("Reason"),
      "Graduated; written off per approval.",
    );
    await user.click(screen.getByRole("button", { name: "Waive Credit" }));

    expect(
      await screen.findByRole("button", { name: "Processing…" }),
    ).toBeDisabled();
  });
});
