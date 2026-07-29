import { http, HttpResponse } from "msw";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";
import { useAuthStore } from "@/lib/store/auth";

import { StudentSearchInput } from "./student-search-input";

import type { PosStudent } from "@/types/order";

const API = "http://localhost:8000";
const QR_CODE = "SB-K8mP3xNzQr4w";

const posStudent: PosStudent = {
  id: 12,
  full_name: "Jorgette Athena Selirio",
  first_name: "Jorgette",
  last_name: "Selirio",
  student_number: "2026-0012",
  grade_level: "Grade 3",
  section: "Rizal",
  has_photo: false,
  student_type: "non_subscription",
  student_type_label: "Non-Subscription",
  enrollment_status: "enrolled",
  enrollment_status_label: "Enrolled",
  points: 0,
  total_spent: "0.00",
  credit_balance: "0.00",
  wallet_balance: 250,
  subscription_daily_status: null,
  subscription_monthly_status: null,
};

/** Captures the body the component posts, and only matches the exact QR code. */
function captureLookup() {
  const captured: { body: Record<string, unknown> | null } = { body: null };
  server.use(
    http.post(`${API}/pos/students/lookup`, async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      if (captured.body.value !== QR_CODE) {
        return HttpResponse.json(
          { message: "Student not found." },
          { status: 404 },
        );
      }
      return HttpResponse.json({ student: posStudent });
    }),
  );
  return captured;
}

/**
 * Mimics a USB/Bluetooth keyboard-wedge scanner: the full code arrives as rapid
 * keydown events followed by Enter, with no key activity immediately before it.
 */
function simulateHardwareScan(code: string) {
  act(() => {
    for (const char of code) {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: char, bubbles: true }),
      );
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

function renderInput(onStudentSelected = jest.fn()) {
  render(
    <StudentSearchInput
      onStudentSelected={onStudentSelected}
      onWalkIn={jest.fn()}
      selectedStudent={null}
      isWalkIn={false}
    />,
  );
  return onStudentSelected;
}

beforeEach(() => {
  useAuthStore.setState({
    token: "test-token",
    user: {
      id: 1,
      first_name: "Ada",
      last_name: "Reyes",
      full_name: "Ada Reyes",
      email: "ada@example.com",
      roles: ["admin"],
      branches: [],
    },
    activeBranch: null,
  });
});

describe("StudentSearchInput — hardware scanner", () => {
  it("sends the complete scanned QR code to the lookup endpoint", async () => {
    const captured = captureLookup();
    const onStudentSelected = renderInput();

    simulateHardwareScan(QR_CODE);

    await waitFor(() => expect(captured.body).not.toBeNull());
    expect(captured.body).toEqual({ type: "qr", value: QR_CODE });
    await waitFor(() =>
      expect(onStudentSelected).toHaveBeenCalledWith(posStudent),
    );
    expect(screen.queryByText("Student Not Found")).not.toBeInTheDocument();
  });

  it("resolves a second scan performed after the first one", async () => {
    const captured = captureLookup();
    const onStudentSelected = renderInput();

    simulateHardwareScan(QR_CODE);
    await waitFor(() => expect(captured.body).not.toBeNull());

    captured.body = null;
    simulateHardwareScan(QR_CODE);

    await waitFor(() => expect(captured.body).not.toBeNull());
    expect(captured.body).toEqual({ type: "qr", value: QR_CODE });
    expect(onStudentSelected).toHaveBeenCalledTimes(2);
  });

  it("does not also name-search the character the browser typed before the burst was recognised", async () => {
    const requests: Record<string, unknown>[] = [];
    server.use(
      http.post(`${API}/pos/students/lookup`, async ({ request }) => {
        requests.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ student: posStudent });
      }),
    );
    const onStudentSelected = renderInput();
    const input = screen.getByPlaceholderText(/scan qr code/i);

    // The seeding character is not suppressed, so a real browser types it into
    // the focused input. jsdom does not perform that default action — fire the
    // change event so the component sees the same state production does.
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: QR_CODE[0], bubbles: true }),
      );
    });
    fireEvent.change(input, { target: { value: QR_CODE[0] } });
    act(() => {
      for (const char of QR_CODE.slice(1)) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: char, bubbles: true }),
        );
      }
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    await waitFor(() =>
      expect(onStudentSelected).toHaveBeenCalledWith(posStudent),
    );
    expect(requests).toEqual([{ type: "qr", value: QR_CODE }]);
  });

  it("shows Student Not Found when the scanned barcode is not a student QR", async () => {
    captureLookup();
    renderInput();

    simulateHardwareScan("4806017370024");

    expect(await screen.findByText("Student Not Found")).toBeInTheDocument();
  });
});

describe("StudentSearchInput — scanner with no Enter terminator", () => {
  // Some hardware scanners type slower than the burst threshold and send no
  // Enter/CR suffix, so the whole code lands in the input as ordinary text and
  // only the debounce fires. It must still be looked up as a QR code, and the
  // uppercase form these scanners emit must be accepted.
  const UPPERCASE_CODE = "SB-K8MP3XNZQR4W";

  it("looks up a QR-shaped value by QR code, not by name", async () => {
    const requests: Record<string, unknown>[] = [];
    server.use(
      http.post(`${API}/pos/students/lookup`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push(body);
        return body.type === "qr"
          ? HttpResponse.json({ student: posStudent })
          : HttpResponse.json({ students: [] });
      }),
    );
    const onStudentSelected = renderInput();
    const input = screen.getByPlaceholderText(/scan qr code/i);

    // One slow keystroke arms the debounce; the rest of the code arrives in the
    // input without ever being recognised as a burst, and no Enter follows.
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: UPPERCASE_CODE[0],
          bubbles: true,
        }),
      );
    });
    fireEvent.change(input, { target: { value: UPPERCASE_CODE } });

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 2000 });
    expect(requests[0]).toEqual({ type: "qr", value: UPPERCASE_CODE });
    await waitFor(() =>
      expect(onStudentSelected).toHaveBeenCalledWith(posStudent),
    );
    expect(screen.queryByText("No students found.")).not.toBeInTheDocument();
  });

  it("still name-searches a value that is not a QR code", async () => {
    const requests: Record<string, unknown>[] = [];
    server.use(
      http.post(`${API}/pos/students/lookup`, async ({ request }) => {
        requests.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ students: [] });
      }),
    );
    renderInput();
    const input = screen.getByPlaceholderText(/scan qr code/i);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "J", bubbles: true }),
      );
    });
    fireEvent.change(input, { target: { value: "Jorgette" } });

    await waitFor(() => expect(requests).toHaveLength(1), { timeout: 2000 });
    expect(requests[0]).toEqual({ type: "search", value: "Jorgette" });
  });
});
