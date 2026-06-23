import { render, screen, within } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { useAuthStore, type AuthState } from "@/lib/store/auth";
import { AppNavSheet } from "./app-nav-sheet";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
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

const mockBranch = { id: 1, name: "Antipolo Branch", slug: "antipolo-branch" };

function makeAuthState(roles: string[]): AuthState {
  return {
    token: "test-token",
    user: {
      id: 1,
      first_name: "Jhersonn",
      last_name: "Cayao",
      full_name: "Jhersonn Cayao",
      email: "jhersonn@test.com",
      roles,
      branches: [{ id: 1, name: "Antipolo Branch", slug: "antipolo-branch" }],
    },
    activeBranch: mockBranch,
    login: jest.fn(),
    logout: jest.fn(),
    setActiveBranch: jest.fn(),
  };
}

beforeEach(() => {
  mockUseAuthStore.mockImplementation(
    (sel: (s: AuthState) => unknown) => sel(makeAuthState(["admin"])),
  );

  server.use(
    http.get(`${API}/pre-registrations`, () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.post(`${API}/auth/logout`, () => HttpResponse.json({})),
  );
});

describe("AppNavSheet", () => {
  it("renders nav sheet with brand header when open", () => {
    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText("Sunbites")).toBeInTheDocument();
    expect(screen.getByText("Your healthy kitchen")).toBeInTheDocument();
    expect(screen.getByText("Antipolo Branch")).toBeInTheDocument();
  });

  it("renders all main nav items", () => {
    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /enrollment/i })).toBeInTheDocument();
    // Scope to the Main group to distinguish it from the Reports "Students" link
    const mainSection = screen.getByText("Main").closest("div");
    expect(within(mainSection!).getByRole("link", { name: /students/i })).toBeInTheDocument();
  });

  it("renders all reports nav items for admin", () => {
    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("link", { name: /sales/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /wallet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /activity log/i })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when a nav link is clicked", async () => {
    const onOpenChange = jest.fn();
    render(<AppNavSheet open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("link", { name: /dashboard/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders logout button", () => {
    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("hides Credits and Activity Log from supervisor", () => {
    mockUseAuthStore.mockImplementation(
      (sel: (s: AuthState) => unknown) => sel(makeAuthState(["supervisor"])),
    );

    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);

    expect(screen.queryByRole("link", { name: /credits/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /activity log/i })).not.toBeInTheDocument();
  });

  it("hides System Settings and Users from non-admin", () => {
    mockUseAuthStore.mockImplementation(
      (sel: (s: AuthState) => unknown) => sel(makeAuthState(["manager"])),
    );

    render(<AppNavSheet open={true} onOpenChange={jest.fn()} />);

    expect(screen.queryByRole("link", { name: /system settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /users/i })).not.toBeInTheDocument();
  });
});
