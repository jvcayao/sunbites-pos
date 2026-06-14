import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { parentDetailFixture } from "@/__tests__/mocks/handlers";
import { useAuthStore, type AuthState } from "@/lib/store/auth";

import ParentDetailPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/references/parents/1",
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

beforeEach(() => {
  mockPush.mockClear();
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: {
        id: 1,
        full_name: "Admin User",
        email: "admin@test.com",
        roles: ["admin"],
      },
      activeBranch: { id: 1, name: "Main Branch", slug: "main-branch" },
      token: "test-token",
    } as AuthState),
  );
});

describe("ParentDetailPage", () => {
  it("renders parent name", async () => {
    render(<ParentDetailPage params={{ id: "1" }} />);
    expect(await screen.findByText("Maria Dela Cruz")).toBeInTheDocument();
  });

  it("shows Disable button for an active, non-deleted parent", async () => {
    render(<ParentDetailPage params={{ id: "1" }} />);
    await screen.findByText("Maria Dela Cruz");
    expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument();
  });

  it("shows Enable button (not Disable) for a disabled parent", async () => {
    server.use(
      http.get(
        `${process.env.NEXT_PUBLIC_API_URL}/references/parents/:id`,
        () =>
          HttpResponse.json({
            ...parentDetailFixture,
            is_disabled: true,
          }),
      ),
    );

    render(<ParentDetailPage params={{ id: "1" }} />);
    await screen.findByText("Maria Dela Cruz");

    expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^disable$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Restore button (not Delete) for a deleted parent", async () => {
    server.use(
      http.get(
        `${process.env.NEXT_PUBLIC_API_URL}/references/parents/:id`,
        () =>
          HttpResponse.json({
            ...parentDetailFixture,
            deleted_at: "2026-06-01T00:00:00.000000Z",
          }),
      ),
    );

    render(<ParentDetailPage params={{ id: "1" }} />);
    await screen.findByText("Maria Dela Cruz");

    expect(
      screen.getByRole("button", { name: /restore/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });

  it("calls disable API and shows success toast on Disable click", async () => {
    const user = userEvent.setup();
    render(<ParentDetailPage params={{ id: "1" }} />);
    await screen.findByText("Maria Dela Cruz");

    const disableBtn = screen.getByRole("button", { name: /disable/i });
    await user.click(disableBtn);

    expect(
      await screen.findByText(/parent access disabled/i),
    ).toBeInTheDocument();
  });

  it("calls delete API and navigates away on Delete click", async () => {
    const user = userEvent.setup();
    render(<ParentDetailPage params={{ id: "1" }} />);
    await screen.findByText("Maria Dela Cruz");

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    expect(
      await screen.findByText(/parent account deleted/i),
    ).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/references/parents");
  });
});
