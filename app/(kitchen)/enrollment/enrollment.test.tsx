import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { render, screen, cleanup } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { useAuthStore, type AuthState } from "@/lib/store/auth";
import EnrollmentPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => "/enrollment",
}));

jest.mock("@/lib/store/auth", () => {
  const actual =
    jest.requireActual("@/lib/store/auth") as typeof import("@/lib/store/auth");
  return {
    ...actual,
    useAuthStore: Object.assign(jest.fn(), {
      getState: actual.useAuthStore.getState,
      setState: actual.useAuthStore.setState,
    }),
  };
});

// Mock base-ui Select with a simple native <select> to avoid portal/pointer-events
// issues in jsdom.
//
// Architecture: Select root collects trigger metadata (id, aria-label) from
// SelectTrigger via a ref callback, then SelectContent renders the actual
// native <select> with options as <option> children.
jest.mock("@/components/ui/select", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  type TriggerMeta = { id?: string; ariaLabel?: string; ariaLabelledBy?: string };

  type CtxValue = {
    value?: string;
    onValueChange?: (v: string) => void;
    registerTrigger?: (meta: TriggerMeta) => void;
    triggerMeta?: TriggerMeta;
  };

  const SelectCtx = React.createContext({} as CtxValue);

  function Select({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string | null) => void;
  }) {
    const [triggerMeta, setTriggerMeta] = React.useState({} as TriggerMeta);
    const registerTrigger = React.useCallback((meta: TriggerMeta) => {
      setTriggerMeta(meta);
    }, []);

    return (
      <SelectCtx.Provider
        value={{
          value,
          onValueChange: (v: string) => onValueChange?.(v),
          registerTrigger,
          triggerMeta,
        }}
      >
        {children}
      </SelectCtx.Provider>
    );
  }

  // SelectTrigger registers its accessibility attributes with the parent Select.
  function SelectTrigger({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
  }: {
    id?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    children?: React.ReactNode;
    size?: string;
    className?: string;
    "aria-invalid"?: boolean;
  }) {
    const { registerTrigger } = React.useContext(SelectCtx);
    React.useLayoutEffect(() => {
      registerTrigger?.({ id, ariaLabel, ariaLabelledBy });
    }, [id, ariaLabel, ariaLabelledBy, registerTrigger]);
    return null;
  }

  // SelectContent renders the actual native <select> with options.
  function SelectContent({ children }: { children: React.ReactNode }) {
    const { value, onValueChange, triggerMeta } = React.useContext(SelectCtx);
    return (
      <select
        id={triggerMeta?.id}
        aria-label={triggerMeta?.ariaLabel}
        aria-labelledby={triggerMeta?.ariaLabelledBy}
        role="combobox"
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="">Select…</option>
        {children}
      </select>
    );
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    return <option value={value}>{children}</option>;
  }

  function SelectValue() {
    return null;
  }

  return {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

const mockUseAuthStore = jest.mocked(useAuthStore);

const adminUser = {
  id: 1,
  first_name: "Test",
  last_name: "Admin",
  full_name: "Test Admin",
  email: "admin@test.com",
  roles: ["admin"] as string[],
  branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
};

beforeEach(() => {
  mockPush.mockClear();
  mockUseAuthStore.mockImplementation((selector) =>
    (selector as (state: AuthState) => unknown)({
      user: adminUser,
      activeBranch: { id: 1, name: "Main Branch", slug: "main-branch" },
      token: "test-token",
    } as AuthState)
  );
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmitForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: /submit enrollment/i });

  await user.click(screen.getByText("Subscription"));

  // Fill subscription period (required for subscription type)
  const startMonthSelect = await screen.findByLabelText(/start month/i);
  await userEvent.selectOptions(startMonthSelect, "june");
  const endMonthSelect = screen.getByLabelText(/end month/i);
  await userEvent.selectOptions(endMonthSelect, "march");

  await user.type(screen.getByLabelText(/first name/i), "Maria");
  await user.type(screen.getByLabelText(/last name/i), "Santos");
  await user.type(screen.getByLabelText(/student no/i), "TEST-001");
  await user.type(screen.getByLabelText(/birthday/i), "2015-03-14");

  const fullNameInputs = screen.getAllByLabelText(/full name/i);
  await user.type(fullNameInputs[0], "Ana Santos");
  await user.type(document.getElementById("contact-0-phone")!, "09171234567");
  await user.type(document.getElementById("contact-0-email")!, "ana@example.com");
  await user.type(document.getElementById("contact-0-address")!, "123 Rizal St");

  // Select relationship via native <select>
  const relCombo = screen.getAllByRole("combobox", { name: /relationship/i })[0];
  await userEvent.selectOptions(relCombo, "Mother");

  // Select grade level via native <select>
  const gradeCombo = screen.getByRole("combobox", { name: /grade level/i });
  await userEvent.selectOptions(gradeCombo, "Grade 3");

  const checkboxes = screen.getAllByRole("checkbox");
  for (const cb of checkboxes) await user.click(cb);
  await user.type(screen.getByLabelText(/your signature/i), "Ana Santos");

  await user.click(screen.getByRole("button", { name: /submit enrollment/i }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EnrollmentPage", () => {
  it("renders the enrollment form heading", async () => {
    render(<EnrollmentPage />);
    expect(
      await screen.findByText(/student enrollment form/i)
    ).toBeInTheDocument();
  });

  it("shows branch and enrollment type sections after data loads", async () => {
    render(<EnrollmentPage />);
    const submitBtn = await screen.findByRole("button", {
      name: /submit enrollment/i,
    });
    expect(submitBtn).toBeInTheDocument();
    expect(screen.getByText("Branch")).toBeInTheDocument();
    expect(screen.getByText("Subscription")).toBeInTheDocument();
  });

  it("shows grade levels from API in the select dropdown", async () => {
    render(<EnrollmentPage />);
    await screen.findByRole("button", { name: /submit enrollment/i });
    const gradeTrigger = screen.getByRole("combobox", {
      name: /grade level/i,
    });
    expect(gradeTrigger).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<EnrollmentPage />);
    const submitBtn = await screen.findByRole("button", {
      name: /submit enrollment/i,
    });
    await user.click(submitBtn);

    expect(
      await screen.findByText(/first name is required/i)
    ).toBeInTheDocument();
  });

  it("shows enrollment success state after successful submission", async () => {
    const user = userEvent.setup();
    render(<EnrollmentPage />);
    await fillAndSubmitForm(user);

    expect(await screen.findByText(/enrollment successful/i)).toBeInTheDocument();
    expect(screen.getByText(/ANT-2025-010/i)).toBeInTheDocument();
  });

  it("shows QR code and print button after successful enrollment", async () => {
    const user = userEvent.setup();
    render(<EnrollmentPage />);
    await fillAndSubmitForm(user);

    await screen.findByText(/enrollment successful/i);
    expect(screen.getByRole("button", { name: /print qr code/i })).toBeInTheDocument();
  });

  it("resets form when Enroll Another Student is clicked", async () => {
    const user = userEvent.setup();
    render(<EnrollmentPage />);
    await fillAndSubmitForm(user);
    await screen.findByText(/enrollment successful/i);

    await user.click(screen.getByRole("button", { name: /enroll another student/i }));
    expect(await screen.findByText(/student enrollment form/i)).toBeInTheDocument();
  });

  it("shows an API error message when submission fails", async () => {
    server.use(
      http.post(`${API}/enrollment`, () =>
        HttpResponse.json(
          { message: "Student number already exists." },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(<EnrollmentPage />);
    await fillAndSubmitForm(user);

    expect(await screen.findByText(/student number already exists/i)).toBeInTheDocument();
  });

  it("allows adding an additional contact", async () => {
    const user = userEvent.setup();
    render(<EnrollmentPage />);
    await screen.findByRole("button", { name: /submit enrollment/i });

    const addBtn = screen.getByRole("button", {
      name: /add another contact/i,
    });
    await user.click(addBtn);

    const fullNameInputs = screen.getAllByLabelText(/full name/i);
    expect(fullNameInputs.length).toBeGreaterThan(1);
  });

  it("shows a loading skeleton while form data is fetching", () => {
    render(<EnrollmentPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
