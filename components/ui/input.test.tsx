import { render, screen } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders without a toggle button for non-password types", () => {
    render(<Input type="text" placeholder="Name" />);
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a Show password toggle button for password type", () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeInTheDocument();
  });

  it("shows the password when the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<Input type="password" placeholder="Password" />);

    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "type",
      "password",
    );

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "type",
      "text",
    );
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeInTheDocument();
  });

  it("hides the password when the toggle is clicked a second time", async () => {
    const user = userEvent.setup();
    render(<Input type="password" placeholder="Password" />);

    await user.click(screen.getByRole("button", { name: "Show password" }));
    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeInTheDocument();
  });

  it("disables the toggle button when the input is disabled", () => {
    render(<Input type="password" placeholder="Password" disabled />);
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeDisabled();
  });
});
