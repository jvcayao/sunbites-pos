import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { useAuthStore, type AuthState } from "@/lib/store/auth";
import {
  paginatedNonSubFixture,
  paginatedSubscriptionFixture,
} from "@/__tests__/mocks/handlers";
import { server } from "@/__tests__/mocks/server";
import StudentsPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/students",
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

  it("non-subscription student row renders in the non-subscription section", async () => {
    render(<StudentsPage />);
    await screen.findByText("Carlo Mendoza");
    const nonSubHeadings = screen.getAllByText(/non-subscription students/i);
    expect(nonSubHeadings.length).toBeGreaterThan(0);
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
      await screen.findByRole("textbox", { name: /search students/i }),
    ).toBeInTheDocument();
  });

  it("selects a student and shows floating bar", async () => {
    const user = userEvent.setup();
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(
      screen.getByRole("button", { name: /print qr codes/i }),
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

  it("retains selected students from subscription section when switching tabs", async () => {
    const user = userEvent.setup();
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(
      screen.getByRole("button", { name: /print qr codes/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    const tabs = screen.getAllByRole("button", { name: /non-subscription/i });
    const nonSubTab = tabs.find((t) =>
      t.textContent?.toLowerCase().includes("non-subscription ("),
    );
    if (nonSubTab) await user.click(nonSubTab);

    expect(
      screen.getByRole("button", { name: /print qr codes/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("hides month and payment status filters on non-subscription tab", async () => {
    const user = userEvent.setup();
    render(<StudentsPage />);
    await screen.findByText("Carlo Mendoza");

    const tabs = screen.getAllByRole("button", { name: /non-subscription/i });
    const nonSubTab = tabs.find((t) =>
      t.textContent?.toLowerCase().includes("non-subscription ("),
    );
    if (nonSubTab) await user.click(nonSubTab);

    expect(
      screen.queryByRole("combobox", { name: /filter by month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /filter by payment status/i }),
    ).not.toBeInTheDocument();
  });

  it("hides month and payment status filters on all tab by default", async () => {
    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    expect(
      screen.queryByRole("combobox", { name: /filter by month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /filter by payment status/i }),
    ).not.toBeInTheDocument();
  });

  it("mixed print batch includes students selected from both sections", async () => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/students`, ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        if (type === "subscription")
          return HttpResponse.json(paginatedSubscriptionFixture);
        if (type === "non_subscription")
          return HttpResponse.json(paginatedNonSubFixture);
        return HttpResponse.json({ ...paginatedNonSubFixture, data: [] });
      }),
    );

    render(<StudentsPage />);
    await screen.findByText("Maria Santos");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    expect(screen.getByText("1")).toBeInTheDocument();

    const tabs = screen.getAllByRole("button", { name: /non-subscription/i });
    const nonSubTab = tabs.find((t) =>
      t.textContent?.toLowerCase().includes("non-subscription ("),
    );
    if (nonSubTab) await user.click(nonSubTab);

    await screen.findByText("Carlo Mendoza");
    const newCheckboxes = screen.getAllByRole("checkbox");
    await user.click(newCheckboxes[0]);
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /print qr codes/i }));

    const cards = document.querySelectorAll("[data-qr-card]");
    expect(cards.length).toBe(2);

    const subCard = cards[0] as HTMLElement;
    expect(
      (subCard.firstElementChild as HTMLElement).style.backgroundColor,
    ).toBe("rgb(229, 50, 42)");

    const nonSubCard = cards[1] as HTMLElement;
    expect(
      (nonSubCard.firstElementChild as HTMLElement).style.backgroundColor,
    ).toBe("rgb(244, 180, 0)");
  });

  describe("PrintCard header colors in batch print modal", () => {
    it("renders a red header for subscription students", async () => {
      const user = userEvent.setup();
      render(<StudentsPage />);
      await screen.findByText("Maria Santos");

      // checkboxes[0] = Maria Santos (subscription) — no select-all checkbox
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      await user.click(screen.getByRole("button", { name: /print qr codes/i }));

      // PrintCard renders into a React Portal on document.body
      const card = document.querySelector("[data-qr-card]") as HTMLElement;
      expect(card).not.toBeNull();
      const header = card.firstElementChild as HTMLElement;
      expect(header.style.backgroundColor).toBe("rgb(229, 50, 42)");
    });

    it("renders a yellow header for non-subscription students", async () => {
      const user = userEvent.setup();
      render(<StudentsPage />);
      await screen.findByText("Carlo Mendoza");

      // checkboxes[1] = Carlo Mendoza (non-subscription) — no select-all checkbox
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);

      await user.click(screen.getByRole("button", { name: /print qr codes/i }));

      const card = document.querySelector("[data-qr-card]") as HTMLElement;
      expect(card).not.toBeNull();
      const header = card.firstElementChild as HTMLElement;
      expect(header.style.backgroundColor).toBe("rgb(244, 180, 0)");
    });
  });
});
