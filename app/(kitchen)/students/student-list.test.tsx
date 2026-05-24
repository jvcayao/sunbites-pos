import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";
import StudentsPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/students",
}));

jest.mock("@/lib/store/auth", () => {
  const actual =
    jest.requireActual("@/lib/store/auth") as typeof import("@/lib/store/auth");
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
    } as AuthState)
  );
});

describe("StudentsPage", () => {
  it("renders student list heading", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText(/student portal/i)).toBeInTheDocument();
  });

  it("shows subscription student with name", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
  });

  it("shows non-subscription student", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText("Carlo Mendoza")).toBeInTheDocument();
  });

  it("shows enrollment status badge", async () => {
    render(<StudentsPage />);
    const enrolledBadges = await screen.findAllByText(/enrolled/i);
    expect(enrolledBadges.length).toBeGreaterThan(0);
  });

  it("shows credit badge when credit_balance > 0", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText(/credit owed/i)).toBeInTheDocument();
  });

  it("shows type tabs for all, subscription, non-subscription", async () => {
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");
    const subButtons = screen.getAllByRole("button", { name: /subscription/i });
    expect(subButtons.length).toBeGreaterThan(0);
  });

  it("shows month payment badges for subscription student", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText(/jun/i)).toBeInTheDocument();
  });

  it("shows wallet-only info box for non-subscription student", async () => {
    render(<StudentsPage />);
    expect(await screen.findByText(/wallet-only/i)).toBeInTheDocument();
  });

  it("shows Enroll Student link", async () => {
    render(<StudentsPage />);
    const enrollLink = await screen.findByRole("link", {
      name: /enroll student/i,
    });
    expect(enrollLink).toHaveAttribute("href", "/enrollment");
  });

  it("filters to subscription tab when clicked", async () => {
    const user = userEvent.setup();
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    const tabs = screen.getAllByRole("button", { name: /subscription/i });
    const subTab = tabs.find((t) => t.textContent?.match(/subscription \(/i));
    if (subTab) {
      await user.click(subTab);
    }
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
  });

  it("shows search input", async () => {
    render(<StudentsPage />);
    expect(
      await screen.findByRole("textbox", { name: /search students/i })
    ).toBeInTheDocument();
  });

  it("selects a student and shows floating bar", async () => {
    const user = userEvent.setup();
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(
      screen.getByRole("button", { name: /print qr codes/i })
    ).toBeInTheDocument();
  });

  it("shows section headings in All tab", async () => {
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");
    const subHeadings = screen.getAllByText(/subscription students/i);
    expect(subHeadings.length).toBeGreaterThan(0);
    const nonSubHeadings = screen.getAllByText(/non-subscription students/i);
    expect(nonSubHeadings.length).toBeGreaterThan(0);
  });
});
