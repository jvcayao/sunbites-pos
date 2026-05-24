import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { staffUserFixture } from "@/__tests__/mocks/handlers";
import { useAuthStore } from "@/lib/store/auth";
import UserDetailPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: mockPush }),
}));

const API = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  mockPush.mockClear();
  // Seed auth store as admin so Edit / Deactivate / Reset actions are rendered
  useAuthStore.setState({
    user: {
      id: 99,
      first_name: "Test",
      last_name: "Admin",
      full_name: "Test Admin",
      email: "admin@sunbites.test",
      roles: ["admin"],
      branches: [],
    },
    token: "test-token",
    activeBranch: null,
  });
});

afterEach(() => {
  useAuthStore.setState({ user: null, token: null, activeBranch: null });
});

describe("UserDetailPage", () => {
  describe("view mode", () => {
    it("renders a skeleton while the user is loading", () => {
      server.use(
        http.get(`${API}/users/:id`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return HttpResponse.json(staffUserFixture);
        })
      );

      render(<UserDetailPage />);

      expect(document.querySelectorAll("[data-slot]").length).toBeGreaterThan(0);
    });

    it("renders the user header with name, role badge, and status", async () => {
      render(<UserDetailPage />);

      expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
      // RoleBadge renders lowercase text; CSS uppercase is visual only
      expect(screen.getByText("cashier")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders position, email, and phone in the header", async () => {
      render(<UserDetailPage />);

      expect(await screen.findByText("Cashier Staff")).toBeInTheDocument();
      // email appears once in header
      expect(screen.getAllByText("juan@sunbites.test").length).toBeGreaterThan(0);
      // phone appears in header and in personal tab
      expect(screen.getAllByText("09171234567").length).toBeGreaterThan(0);
    });

    it("renders all four tabs", async () => {
      render(<UserDetailPage />);

      await screen.findByText("Juan Dela Cruz");

      expect(screen.getByRole("tab", { name: "Personal Info" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Employment" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Gov't IDs" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Branches" })).toBeInTheDocument();
    });

    it("shows the Edit button in view mode", async () => {
      render(<UserDetailPage />);

      await screen.findByText("Juan Dela Cruz");

      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    it("shows an error state when the API fails", async () => {
      server.use(
        http.get(`${API}/users/:id`, () =>
          HttpResponse.json({ message: "Not found" }, { status: 404 })
        )
      );

      render(<UserDetailPage />);

      expect(
        await screen.findByText("Failed to load user. Please try again.")
      ).toBeInTheDocument();
    });

    it("shows 'Inactive' status for deactivated users", async () => {
      server.use(
        http.get(`${API}/users/:id`, () =>
          HttpResponse.json({ ...staffUserFixture, is_active: false })
        )
      );

      render(<UserDetailPage />);

      expect(await screen.findByText("Inactive")).toBeInTheDocument();
    });

    it("shows branch names in the Branches tab", async () => {
      render(<UserDetailPage />);

      await screen.findByText("Juan Dela Cruz");

      await userEvent.click(screen.getByRole("tab", { name: "Branches" }));

      expect(await screen.findByText("Main Branch")).toBeInTheDocument();
    });

    it("shows 'No branches assigned' when user has no branches", async () => {
      server.use(
        http.get(`${API}/users/:id`, () =>
          HttpResponse.json({ ...staffUserFixture, branches: [] })
        )
      );

      render(<UserDetailPage />);
      await screen.findByText("Juan Dela Cruz");

      await userEvent.click(screen.getByRole("tab", { name: "Branches" }));

      expect(await screen.findByText("No branches assigned.")).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("switches to edit mode when Edit is clicked", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));

      expect(screen.getByText("Edit Juan Dela Cruz")).toBeInTheDocument();
    });

    it("pre-fills the form with the current user's data", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));

      expect(screen.getByDisplayValue("Juan")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Dela Cruz")).toBeInTheDocument();
      expect(screen.getByDisplayValue("juan@sunbites.test")).toBeInTheDocument();
    });

    it("pre-checks the branch checkboxes for assigned branches", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));

      // @base-ui Checkbox accessible name comes from enclosing <label> text
      const mainBranchCheckbox = await screen.findByRole("checkbox", {
        name: "Main Branch",
      }, { timeout: 3000 });
      expect(mainBranchCheckbox).toBeChecked();

      const southBranchCheckbox = screen.getByRole("checkbox", {
        name: "South Branch",
      });
      expect(southBranchCheckbox).not.toBeChecked();
    });

    it("returns to view mode when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));
      expect(screen.getByText("Edit Juan Dela Cruz")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByText("Edit Juan Dela Cruz")).not.toBeInTheDocument();
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    it("shows validation errors when required edit fields are cleared", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));

      const firstNameInput = screen.getByDisplayValue("Juan");
      await user.clear(firstNameInput);
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(await screen.findByText("First name is required")).toBeInTheDocument();
    });

    it("calls update API and returns to view mode on success", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "Edit" }));

      const firstNameInput = screen.getByDisplayValue("Juan");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jose");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(screen.queryByText("Edit Juan Dela Cruz")).not.toBeInTheDocument();
      });
    });
  });

  describe("deactivate flow", () => {
    it("shows a deactivate option in the more actions menu for active users", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "More actions" }));

      expect(await screen.findByRole("menuitem", { name: "Deactivate" })).toBeInTheDocument();
    });

    it("opens a confirmation dialog when Deactivate is selected", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "More actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Deactivate" }));

      // Dialog title may render across text nodes — match by heading role
      expect(
        await screen.findByRole("heading", { name: /Deactivate Juan Dela Cruz/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "This user will no longer be able to log in. You can reactivate them at any time."
        )
      ).toBeInTheDocument();
    });

    it("closes the dialog when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "More actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Deactivate" }));
      await screen.findByRole("heading", { name: /Deactivate Juan Dela Cruz/i });

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /Deactivate Juan Dela Cruz/i })
        ).not.toBeInTheDocument();
      });
    });

    it("calls the deactivate API and closes the dialog on confirm", async () => {
      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "More actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Deactivate" }));
      await screen.findByRole("heading", { name: /Deactivate Juan Dela Cruz/i });

      await user.click(screen.getByRole("button", { name: "Deactivate" }));

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /Deactivate Juan Dela Cruz/i })
        ).not.toBeInTheDocument();
      });
    });

    it("shows Reactivate instead of Deactivate for inactive users", async () => {
      server.use(
        http.get(`${API}/users/:id`, () =>
          HttpResponse.json({ ...staffUserFixture, is_active: false })
        )
      );

      const user = userEvent.setup();
      render(<UserDetailPage />);

      await user.click(await screen.findByRole("button", { name: "More actions" }));

      expect(await screen.findByRole("menuitem", { name: "Reactivate" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Deactivate" })).not.toBeInTheDocument();
    });
  });
});
