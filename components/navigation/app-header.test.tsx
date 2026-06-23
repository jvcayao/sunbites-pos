import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./app-header";

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
jest.mock("@/components/notification-bell", () => ({
  NotificationBell: () => <button>Notifications</button>,
}));

const mockUser = {
  id: 1,
  first_name: "Jhersonn",
  last_name: "Cayao",
  roles: ["admin"],
  branches: [{ id: 1, name: "Antipolo Branch" }],
};
const mockBranch = { id: 1, name: "Antipolo Branch" };

jest.mock("@/lib/store/auth", () => ({
  useAuthStore: Object.assign(
    (sel: (s: { user: typeof mockUser; activeBranch: typeof mockBranch }) => unknown) =>
      sel({ user: mockUser, activeBranch: mockBranch }),
    { getState: () => ({ user: mockUser, activeBranch: mockBranch, logout: jest.fn() }) },
  ),
}));

describe("AppHeader", () => {
  it("renders brand text", () => {
    render(<AppHeader onMenuOpen={jest.fn()} />);
    expect(screen.getByText("Sunbites")).toBeInTheDocument();
    expect(screen.getByText("Your healthy kitchen")).toBeInTheDocument();
  });

  it("renders current page name derived from pathname", () => {
    render(<AppHeader onMenuOpen={jest.fn()} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders branch name", () => {
    render(<AppHeader onMenuOpen={jest.fn()} />);
    expect(screen.getByText("Antipolo Branch")).toBeInTheDocument();
  });

  it("renders user name and role", () => {
    render(<AppHeader onMenuOpen={jest.fn()} />);
    expect(screen.getByText("Jhersonn Cayao")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("calls onMenuOpen when hamburger button is clicked", async () => {
    const onMenuOpen = jest.fn();
    render(<AppHeader onMenuOpen={onMenuOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(onMenuOpen).toHaveBeenCalledTimes(1);
  });
});
