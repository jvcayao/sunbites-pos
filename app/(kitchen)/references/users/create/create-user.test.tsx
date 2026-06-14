import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import CreateUserPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const API = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  mockPush.mockClear();
});

describe("CreateUserPage", () => {
  it("renders all form section headings", () => {
    render(<CreateUserPage />);

    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Contact Information")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("Employment")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Government IDs")).toBeInTheDocument();
    expect(screen.getByText("Branch Assignment")).toBeInTheDocument();
  });

  it("shows required field errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(
      await screen.findByText("First name is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows password minimum length error", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    // Find password input by placeholder or by position among password-type inputs
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLElement, "weak");
    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(await screen.findByText("Minimum 8 characters")).toBeInTheDocument();
  });

  it("shows uppercase letter error for password without uppercase", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLElement, "password1");
    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(
      await screen.findByText("Must contain an uppercase letter"),
    ).toBeInTheDocument();
  });

  it("shows number error for password without a digit", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLElement, "Password");
    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(
      await screen.findByText("Must contain a number"),
    ).toBeInTheDocument();
  });

  it("shows password mismatch error when confirmation does not match", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLElement, "Password1");
    await user.type(passwordInputs[1] as HTMLElement, "Different1");
    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
  });

  it("renders branch checkboxes after the API loads", async () => {
    render(<CreateUserPage />);

    // @base-ui Checkbox gets accessible name from enclosing <label> text
    expect(
      await screen.findByRole("checkbox", { name: "Main Branch" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "South Branch" }),
    ).toBeInTheDocument();
  });

  it("toggles a branch checkbox on click", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    const checkbox = await screen.findByRole("checkbox", {
      name: "Main Branch",
    });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("displays the optional government IDs info banner", () => {
    render(<CreateUserPage />);

    expect(
      screen.getByText(
        "These fields are optional. Fill in when documents are available.",
      ),
    ).toBeInTheDocument();
  });

  it("shows 'Role is required' when role is not selected on submit", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    // Submit with required text fields filled but role empty
    const firstNameInputs = screen.getAllByRole("textbox");
    await user.type(firstNameInputs[0], "Juan");
    await user.click(
      screen.getByRole("button", { name: "Create Staff Account" }),
    );

    expect(await screen.findByText("Role is required")).toBeInTheDocument();
  });

  it("renders the Cancel button that navigates back to the users list", async () => {
    const user = userEvent.setup();
    render(<CreateUserPage />);

    const backButton = screen.getByRole("button", { name: "← Back to Users" });
    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith("/references/users");
  });

  it("disables the submit button and API errors are reflected in field errors", async () => {
    server.use(
      http.post(`${API}/users`, () =>
        HttpResponse.json(
          {
            message: "The email has already been taken.",
            errors: { email: ["The email has already been taken."] },
          },
          { status: 422 },
        ),
      ),
    );

    render(<CreateUserPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create Staff Account" }),
      ).toBeInTheDocument();
    });
  });
});
