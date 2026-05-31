import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";

import BranchesPage from "./page";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

// Preserve getState/setState so apiClient can read the store while mocking the hook
jest.mock("@/lib/store/auth", () => {
  const actual = jest.requireActual("@/lib/store/auth") as typeof import("@/lib/store/auth");
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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

beforeEach(() => {
  mockReplace.mockClear();
  // Default: authenticated admin user
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({ user: adminUser, activeBranch: null } as AuthState)
  );
});

describe("BranchesPage", () => {
  it("renders the Branch Management heading", () => {
    render(<BranchesPage />);

    expect(screen.getByText("Branch Management")).toBeInTheDocument();
  });

  it("renders branch cards with name after data loads", async () => {
    render(<BranchesPage />);

    expect(await screen.findByText("Main Branch")).toBeInTheDocument();
    expect(screen.getByText("South Branch")).toBeInTheDocument();
  });

  it("shows staff, student, and orders stats for each branch", async () => {
    render(<BranchesPage />);

    await screen.findByText("Main Branch");

    expect(screen.getByText(/Staff: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Students: 10/)).toBeInTheDocument();
  });

  it("shows an error message when the API fails", async () => {
    server.use(
      http.get(`${API}/branches`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    );

    render(<BranchesPage />);

    expect(await screen.findByText("Failed to load branches.")).toBeInTheDocument();
  });

  it("opens the edit dialog with pre-filled branch name when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<BranchesPage />);

    await screen.findByText("Main Branch");

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/branch name/i)).toHaveValue("Main Branch");
  });

  it("closes the edit dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<BranchesPage />);

    await screen.findByText("Main Branch");

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a validation error when the branch name is cleared", async () => {
    const user = userEvent.setup();
    render(<BranchesPage />);

    await screen.findByText("Main Branch");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const nameInput = screen.getByLabelText(/branch name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Branch name is required")).toBeInTheDocument();
  });

  it("submits the edit form and closes the dialog on success", async () => {
    const user = userEvent.setup();
    render(<BranchesPage />);

    await screen.findByText("Main Branch");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const nameInput = screen.getByLabelText(/branch name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Branch Name");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows a 422 error message when trying to deactivate the last active branch", async () => {
    server.use(
      http.post(`${API}/branches/:id/toggle`, () =>
        HttpResponse.json(
          { message: "At least one branch must remain active." },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();

    jest.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(<BranchesPage />);

    await screen.findByText("Main Branch");

    const deactivateButtons = screen.getAllByRole("button", { name: "Deactivate" });
    await user.click(deactivateButtons[0]);

    expect(
      await screen.findByText("At least one branch must remain active.")
    ).toBeInTheDocument();
  });

  it("redirects non-admin users to /dashboard", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({
        user: { ...adminUser, roles: ["manager"] },
        activeBranch: null,
      } as AuthState)
    );

    render(<BranchesPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows nothing (null) while non-admin redirect is pending", () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({
        user: { ...adminUser, roles: ["cashier"] },
        activeBranch: null,
      } as AuthState)
    );

    const { container } = render(<BranchesPage />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an empty state message when no branches are returned", async () => {
    server.use(
      http.get(`${API}/branches`, () => HttpResponse.json([]))
    );

    render(<BranchesPage />);

    expect(await screen.findByText("No branches found.")).toBeInTheDocument();
  });
});
