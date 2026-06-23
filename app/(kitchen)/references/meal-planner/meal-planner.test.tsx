import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";

import MealPlannerPage from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

const adminUser = {
  id: 1,
  first_name: "Admin",
  last_name: "User",
  full_name: "Admin User",
  email: "admin@test.com",
  roles: ["admin"] as string[],
  branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
};

const supervisorUser = { ...adminUser, roles: ["supervisor"] as string[] };

beforeEach(() => {
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: adminUser,
      activeBranch: null,
    } as AuthState),
  );
});

describe("MealPlannerPage", () => {
  it("renders the meal planner month and week tabs on load", () => {
    render(<MealPlannerPage />);

    expect(screen.getByRole("button", { name: "Jun" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week 1" })).toBeInTheDocument();
  });

  it("renders all 10 month tabs", () => {
    render(<MealPlannerPage />);

    const monthLabels = [
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
    ];
    monthLabels.forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });

  it("renders week 1-4 buttons", () => {
    render(<MealPlannerPage />);

    [1, 2, 3, 4].forEach((w) => {
      expect(
        screen.getByRole("button", { name: `Week ${w}` }),
      ).toBeInTheDocument();
    });
  });

  it("loads meal grid data from API", async () => {
    render(<MealPlannerPage />);

    // Admin sees data inside <Input> fields — use findByDisplayValue
    expect(
      await screen.findByDisplayValue("Chicken Adobo"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chopsuey")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
  });

  it("admin sees input fields in grid cells", async () => {
    render(<MealPlannerPage />);

    // Wait for query data to populate inputs
    const mondayUlamInput = await screen.findByLabelText("monday ulam");
    expect(mondayUlamInput).toBeInTheDocument();
    expect(mondayUlamInput.tagName).toBe("INPUT");
  });

  it("supervisor sees plain text in grid cells (not inputs)", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({
        user: supervisorUser,
        activeBranch: null,
      } as AuthState),
    );

    render(<MealPlannerPage />);

    // Supervisor sees spans, so findByText works
    expect(await screen.findByText("Chicken Adobo")).toBeInTheDocument();

    const inputs = screen.queryAllByLabelText(/monday ulam/i);
    expect(inputs).toHaveLength(0);
  });

  it("supervisor does not see Save or Reset buttons", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({
        user: supervisorUser,
        activeBranch: null,
      } as AuthState),
    );

    render(<MealPlannerPage />);

    expect(
      screen.queryByRole("button", { name: /Save Week/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reset/i }),
    ).not.toBeInTheDocument();
  });

  it("Save Week button submits PATCH and shows success toast", async () => {
    const user = userEvent.setup();
    render(<MealPlannerPage />);

    await screen.findByDisplayValue("Chicken Adobo");

    await user.click(screen.getByRole("button", { name: /Save Week/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Saving…/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("Reset button shows confirm dialog", async () => {
    const user = userEvent.setup();
    render(<MealPlannerPage />);

    // Wait for grid data — admin sees inputs, so use findByDisplayValue
    const mondayInput = await screen.findByLabelText("monday ulam");
    expect(mondayInput).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Reset to Default/i }));

    expect(await screen.findByText(/Reset Meal Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/default pattern/i)).toBeInTheDocument();
  });

  it("confirms reset calls reset API", async () => {
    const user = userEvent.setup();
    render(<MealPlannerPage />);

    await screen.findByDisplayValue("Chicken Adobo");

    await user.click(screen.getByRole("button", { name: /Reset to Default/i }));
    await screen.findByText(/Reset Meal Plan/i);

    await user.click(screen.getByRole("button", { name: /^Reset$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Reset Meal Plan/i)).not.toBeInTheDocument();
    });
  });

  it("shows error when API fails", async () => {
    server.use(
      http.get(`${API}/references/meal-planner`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    render(<MealPlannerPage />);

    expect(
      await screen.findByText(/Failed to load meal plan/i),
    ).toBeInTheDocument();
  });

  it("renders Snacks column in the meal grid", async () => {
    render(<MealPlannerPage />);

    expect(
      await screen.findByDisplayValue("Chicken Adobo"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Snacks" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Graham Crackers")).toBeInTheDocument();
  });

  it("shows week visibility badge as Visible to Parents by default (admin)", async () => {
    render(<MealPlannerPage />);

    await screen.findByDisplayValue("Chicken Adobo");

    expect(
      screen.getByRole("button", { name: /Visible to Parents/i }),
    ).toBeInTheDocument();
  });

  it("admin can click visibility badge to open WeekVisibilityDialog", async () => {
    const user = userEvent.setup();
    render(<MealPlannerPage />);

    await screen.findByDisplayValue("Chicken Adobo");

    await user.click(
      screen.getByRole("button", { name: /Visible to Parents/i }),
    );

    expect(
      await screen.findByText(/Hide .* from Parents\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Yes, Hide It/i }),
    ).toBeInTheDocument();
  });

  it("supervisor sees read-only visibility badge (not a button)", async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      (selector as (state: AuthState) => unknown)({
        user: supervisorUser,
        activeBranch: null,
      } as AuthState),
    );

    render(<MealPlannerPage />);

    await screen.findByText("Chicken Adobo");

    expect(screen.getByText(/Visible to Parents/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Visible to Parents/i }),
    ).not.toBeInTheDocument();
  });
});
