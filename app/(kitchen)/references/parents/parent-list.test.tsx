import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import {
  disabledParentFixture,
  deletedParentFixture,
  paginatedParentsFixture,
} from "@/__tests__/mocks/handlers";
import { useAuthStore, type AuthState } from "@/lib/store/auth";

import ParentsPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/references/parents",
  useParams: () => ({}),
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

describe("ParentsPage", () => {
  it("renders active parent name", async () => {
    render(<ParentsPage />);
    expect(await screen.findByText("Maria Dela Cruz")).toBeInTheDocument();
  });

  it("renders Active badge for an active parent", async () => {
    render(<ParentsPage />);
    await screen.findByText("Maria Dela Cruz");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Disabled badge for a disabled parent", async () => {
    render(<ParentsPage />);
    await screen.findByText("Disabled Parent");
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders Deleted badge when deleted_at is set", async () => {
    server.use(
      http.get(`${process.env.NEXT_PUBLIC_API_URL}/references/parents`, () =>
        HttpResponse.json({
          ...paginatedParentsFixture,
          data: [deletedParentFixture],
        }),
      ),
    );

    render(<ParentsPage />);
    await screen.findByText("Deleted Parent");
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("shows 'Show deleted' checkbox", async () => {
    render(<ParentsPage />);
    expect(
      await screen.findByRole("checkbox", { name: /show deleted/i }),
    ).toBeInTheDocument();
  });

  it("clicking View navigates to the parent detail page", async () => {
    const user = userEvent.setup();
    render(<ParentsPage />);
    const viewButtons = await screen.findAllByRole("button", { name: /view/i });
    await user.click(viewButtons[0]);
    expect(mockPush).toHaveBeenCalledWith(
      `/references/parents/${paginatedParentsFixture.data[0].id}`,
    );
  });
});
