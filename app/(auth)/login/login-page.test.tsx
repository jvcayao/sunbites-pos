import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import LoginPage from "./page";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const API = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows field errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows a field error for an invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
  });

  it("redirects to /dashboard on successful login with a single branch", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("Email address"),
      "staff@sunbites.test",
    );
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects to /branch on successful login with multiple branches", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          token: "test-token",
          user: {
            id: 1,
            full_name: "Test Staff",
            email: "staff@sunbites.test",
            branches: [
              { id: 1, name: "Main Branch", slug: "main" },
              { id: 2, name: "South Branch", slug: "south" },
            ],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("Email address"),
      "staff@sunbites.test",
    );
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/branch"));
  });

  it("shows the no-branch error banner when user has no branch assigned", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          token: "test-token",
          user: {
            id: 1,
            full_name: "Test Staff",
            email: "staff@sunbites.test",
            branches: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("Email address"),
      "staff@sunbites.test",
    );
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(
        "Your account has no branch assigned. Contact your administrator.",
      ),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an inline error banner when the API returns an error", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          { message: "These credentials do not match our records." },
          { status: 422 },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("Email address"),
      "staff@sunbites.test",
    );
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("These credentials do not match our records."),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables the submit button while the request is in flight", async () => {
    server.use(
      http.post(`${API}/auth/login`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          token: "t",
          user: { id: 1, full_name: "T", email: "t@t.com", branches: [] },
        });
      }),
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("Email address"),
      "staff@sunbites.test",
    );
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("shows the admin contact message", () => {
    render(<LoginPage />);
    expect(
      screen.getByText("Contact your administrator for password assistance."),
    ).toBeInTheDocument();
  });
});
