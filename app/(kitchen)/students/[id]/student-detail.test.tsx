import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";
import StudentDetailPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/students/1",
  useParams: () => ({ id: "1" }),
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

beforeEach(() => {
  mockPush.mockClear();
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: adminUser,
      activeBranch: { id: 1, name: "Main Branch", slug: "main-branch" },
      token: "test-token",
    } as AuthState),
  );
});

describe("StudentDetailPage", () => {
  it("renders student name in header", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    expect((await screen.findAllByText("Maria Santos")).length).toBeGreaterThan(
      0,
    );
  });

  it("shows tabs: Profile, Wallet, Order History, Payment, Logs", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    expect(screen.getByRole("tab", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /wallet/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /order history/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /payment/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /logs/i })).toBeInTheDocument();
  });

  it("shows QR code ID in profile tab", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");
    expect(screen.getAllByText(/SB-K8mP3xNzQr4w/i).length).toBeGreaterThan(0);
  });

  it("shows wallet balance", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    const balances = await screen.findAllByText(/₱450/i);
    expect(balances.length).toBeGreaterThan(0);
  });

  it("shows payment months when switching to Payment tab", async () => {
    const user = userEvent.setup();
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    const paymentTab = screen.getByRole("tab", { name: /payment/i });
    await user.click(paymentTab);

    expect(await screen.findByText(/june/i)).toBeInTheDocument();
  });

  it("shows order history placeholder", async () => {
    const user = userEvent.setup();
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    const orderTab = screen.getByRole("tab", { name: /order history/i });
    await user.click(orderTab);

    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
  });

  it("shows a Back to Students button", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    expect(
      screen.getByRole("button", { name: /students/i }),
    ).toBeInTheDocument();
  });

  it("shows student grade level", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    expect(screen.getAllByText(/grade 3/i).length).toBeGreaterThan(0);
  });

  it("shows enrolled status badge", async () => {
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    expect(screen.getAllByText(/enrolled/i).length).toBeGreaterThan(0);
  });

  it("shows wallet tab with balance and top-up button", async () => {
    const user = userEvent.setup();
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    const walletTab = screen.getByRole("tab", { name: /wallet/i });
    await user.click(walletTab);

    const balances = await screen.findAllByText(/₱450/i);
    expect(balances.length).toBeGreaterThan(0);
    const topUpButtons = screen.getAllByRole("button", { name: /\+ top up/i });
    expect(topUpButtons.length).toBeGreaterThan(0);
  });

  it("shows empty logs message when no activity logs", async () => {
    const user = userEvent.setup();
    render(<StudentDetailPage params={{ id: "1" }} />);
    await screen.findAllByText("Maria Santos");

    const logsTab = screen.getByRole("tab", { name: /logs/i });
    await user.click(logsTab);

    expect(
      await screen.findByText(/no activity logs yet/i),
    ).toBeInTheDocument();
  });
});
