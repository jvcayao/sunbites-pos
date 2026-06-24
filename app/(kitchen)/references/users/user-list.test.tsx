import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { render, screen, waitFor } from "@/__tests__/test-utils";

import UsersPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const API = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  mockPush.mockClear();
});

describe("UsersPage", () => {
  it("renders the Add New User button", () => {
    render(<UsersPage />);

    expect(screen.getByRole("link", { name: /add new user/i })).toHaveAttribute(
      "href",
      "/references/users/create",
    );
  });

  it("renders the user table with data from the API", async () => {
    render(<UsersPage />);

    expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("juan@sunbites.test")).toBeInTheDocument();
    expect(screen.getByText("Main Branch")).toBeInTheDocument();
  });

  it("renders a View link for each user pointing to the detail page", async () => {
    render(<UsersPage />);

    const viewLink = await screen.findByRole("link", { name: "View" });
    expect(viewLink).toHaveAttribute("href", "/references/users/1");
  });

  it("shows 'No users found' when the list is empty", async () => {
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({
          data: [],
          links: { first: null, last: null, prev: null, next: null },
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 0,
            from: null,
            to: null,
          },
        }),
      ),
    );

    render(<UsersPage />);

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("shows an error message when the API fails", async () => {
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    render(<UsersPage />);

    expect(
      await screen.findByText("Failed to load users. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    render(<UsersPage />);

    expect(
      screen.getByRole("textbox", { name: "Search users" }),
    ).toBeInTheDocument();
  });

  it("shows pagination only when there are multiple pages", async () => {
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({
          data: [],
          links: { first: null, last: null, prev: null, next: null },
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 0,
            from: null,
            to: null,
          },
        }),
      ),
    );

    render(<UsersPage />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Previous page" }),
      ).not.toBeInTheDocument();
    });
  });

  it("dims deactivated user rows", async () => {
    server.use(
      http.get(`${API}/users`, () =>
        HttpResponse.json({
          data: [
            {
              id: 2,
              first_name: "Maria",
              last_name: "Santos",
              full_name: "Maria Santos",
              email: "maria@sunbites.test",
              is_active: false,
              roles: ["cashier"],
              branches: [],
            },
          ],
          links: { first: null, last: null, prev: null, next: null },
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 1,
            from: 1,
            to: 1,
          },
        }),
      ),
    );

    render(<UsersPage />);

    await screen.findByText("Maria Santos");
    const row = screen.getByText("Maria Santos").closest("tr");
    expect(row).toHaveClass("opacity-60");
  });
});
