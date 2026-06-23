import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
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

const mockAdmin = {
  id: 1,
  first_name: "Jhersonn",
  last_name: "Cayao",
  roles: ["admin"],
  branches: [{ id: 1, name: "Antipolo Branch" }],
};
const mockBranch = { id: 1, name: "Antipolo Branch" };

function mockAuthStore(overrides: Partial<typeof mockAdmin> = {}) {
  const user = { ...mockAdmin, ...overrides };
  jest.mock("@/lib/store/auth", () => ({
    useAuthStore: (sel: (s: { user: typeof mockAdmin; activeBranch: typeof mockBranch; logout: () => void }) => unknown) =>
      sel({ user, activeBranch: mockBranch, logout: jest.fn() }),
  }));
}

beforeEach(() => {
  server.use(
    http.get(`${API}/pre-registrations`, () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.post(`${API}/auth/logout`, () => HttpResponse.json({})),
  );
});

jest.mock("@/lib/store/auth", () => ({
  useAuthStore: Object.assign(
    (sel: (s: { user: typeof mockAdmin; activeBranch: typeof mockBranch; logout: () => void }) => unknown) =>
      sel({ user: mockAdmin, activeBranch: mockBranch, logout: jest.fn() }),
    { getState: () => ({ user: mockAdmin, activeBranch: mockBranch, logout: jest.fn() }) },
  ),
}));

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
    // "Students" appears in both main nav and reports nav — getAllByRole handles the ambiguity
    expect(screen.getAllByRole("link", { name: /students/i }).length).toBeGreaterThanOrEqual(1);
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
});
