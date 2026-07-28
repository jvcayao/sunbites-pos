import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";

import { CartPanel } from "./cart-panel";

const API = "http://localhost:8000";

/** Captures the JSON body the component actually posts to /pos/checkout. */
function captureCheckout() {
  const captured: { body: Record<string, unknown> | null } = { body: null };
  server.use(
    http.post(`${API}/pos/checkout`, async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 1, receipt_number: "R-0001" });
    }),
  );
  return captured;
}

function seedAdmin() {
  useAuthStore.setState({
    token: "test-token",
    user: {
      id: 1,
      first_name: "Ada",
      last_name: "Reyes",
      full_name: "Ada Reyes",
      email: "ada@example.com",
      roles: ["admin"],
      branches: [],
    },
    activeBranch: null,
  });
}

function seedCart() {
  useCartStore.setState({
    items: [
      {
        id: 7,
        name: "Chicken Adobo",
        price: 100,
        quantity: 2,
        category: "meal",
      },
    ],
    student: null,
    isWalkIn: true,
    paymentMethod: "cash",
    notes: "",
  });
}

beforeEach(() => {
  seedAdmin();
  seedCart();
});

afterEach(() => {
  useCartStore.getState().clearCart();
  useAuthStore.getState().logout();
});

/** Walks the two-step confirm flow and returns once the request has landed. */
async function proceedToCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Amount Tendered"), "500");
  await user.click(screen.getByRole("button", { name: /Confirm Purchase/ }));
  await user.click(screen.getByRole("button", { name: "Proceed" }));
}

describe("CartPanel checkout payload", () => {
  it("sends discount_type and discount_value, not a precomputed discount_amount", async () => {
    const captured = captureCheckout();
    const user = userEvent.setup();

    render(<CartPanel onOrderComplete={jest.fn()} />);

    // Subtotal is 200.00 (2 x 100). Apply a fixed ₱20 discount.
    await user.type(screen.getByLabelText("Discount amount"), "20");
    await user.type(
      screen.getByLabelText("Discount reason"),
      "Staff meal allowance",
    );
    await proceedToCheckout(user);

    await waitFor(() => expect(captured.body).not.toBeNull());

    expect(captured.body).toMatchObject({
      discount_type: "fixed",
      discount_value: 20,
      discount_reason: "Staff meal allowance",
    });
    // The API never reads this key — sending it means no discount is applied.
    expect(captured.body).not.toHaveProperty("discount_amount");
  });

  it("sends percent discounts as the raw percentage, not the peso amount", async () => {
    const captured = captureCheckout();
    const user = userEvent.setup();

    render(<CartPanel onOrderComplete={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "% Percent" }));
    await user.type(screen.getByLabelText("Discount amount"), "10");
    await user.type(screen.getByLabelText("Discount reason"), "Promo day");
    await proceedToCheckout(user);

    await waitFor(() => expect(captured.body).not.toBeNull());

    // 10 (the percentage) — never 20, the peso amount derived from a 200 subtotal.
    expect(captured.body).toMatchObject({
      discount_type: "percent",
      discount_value: 10,
    });
  });

  it("omits all discount fields when no discount is entered", async () => {
    const captured = captureCheckout();
    const user = userEvent.setup();

    render(<CartPanel onOrderComplete={jest.fn()} />);
    await proceedToCheckout(user);

    await waitFor(() => expect(captured.body).not.toBeNull());

    expect(captured.body).not.toHaveProperty("discount_type");
    expect(captured.body).not.toHaveProperty("discount_value");
    expect(captured.body).not.toHaveProperty("discount_reason");
  });

  it("blocks checkout when a discount has no reason", async () => {
    const captured = captureCheckout();
    const user = userEvent.setup();

    render(<CartPanel onOrderComplete={jest.fn()} />);

    await user.type(screen.getByLabelText("Discount amount"), "20");
    await proceedToCheckout(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A reason is required when applying a discount.",
    );
    expect(captured.body).toBeNull();
  });
});
