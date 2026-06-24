import { act, render, screen } from "@/__tests__/test-utils";
import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import KioskPage from "./page";

// Mock @zxing/browser — camera does not work in jsdom
let capturedScanCallback:
  | ((result: { getText: () => string } | null) => void)
  | null = null;

jest.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: {
    decodeFromVideoDevice: jest.fn(
      (
        _deviceId: unknown,
        _video: unknown,
        callback: (result: { getText: () => string } | null) => void,
      ) => {
        capturedScanCallback = callback;
        return Promise.resolve({ stop: jest.fn() });
      },
    ),
  },
}));

const simulateScan = (qrCode: string) => {
  act(() => {
    capturedScanCallback?.({ getText: () => qrCode });
  });
};

describe("KioskPage", () => {
  beforeEach(() => {
    capturedScanCallback = null;
  });

  it("shows the scan prompt on initial load", () => {
    render(<KioskPage />);
    expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
  });

  it("shows the student result card after a successful scan", async () => {
    render(<KioskPage />);

    simulateScan("SB-testqrcode1234");

    expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("Grade 3")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("₱245.00")).toBeInTheDocument();
    expect(screen.getByText("Rice Meal, Water")).toBeInTheDocument();
  });

  it("shows green balance for amount >= 50", async () => {
    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    const balance = await screen.findByText("₱245.00");
    expect(balance).toHaveClass("text-green-600");
  });

  it("shows orange balance for amount between 0 and 50", async () => {
    server.use(
      http.post(
        `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
        () =>
          HttpResponse.json({
            name: "Juan Dela Cruz",
            initials: "JD",
            grade_level: "Grade 3",
            student_type: "subscription",
            balance: "30.00",
            last_orders: [],
          }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    const balance = await screen.findByText("₱30.00");
    expect(balance).toHaveClass("text-orange-500");
  });

  it("shows red balance for zero balance", async () => {
    server.use(
      http.post(
        `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
        () =>
          HttpResponse.json({
            name: "Juan Dela Cruz",
            initials: "JD",
            grade_level: "Grade 3",
            student_type: "subscription",
            balance: "0.00",
            last_orders: [],
          }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    const balance = await screen.findByText("₱0.00");
    expect(balance).toHaveClass("text-red-600");
  });

  it("shows the same error card for 404", async () => {
    server.use(
      http.post(
        `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
        () =>
          HttpResponse.json({ message: "Student not found." }, { status: 404 }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    expect(await screen.findByText(/please see a cashier/i)).toBeInTheDocument();
  });

  it("shows the same error card for 403 (restricted student)", async () => {
    server.use(
      http.post(
        `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
        () =>
          HttpResponse.json(
            { message: "Student is not eligible." },
            { status: 403 },
          ),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    expect(await screen.findByText(/please see a cashier/i)).toBeInTheDocument();
  });

  it("auto-resets to scan state after 10 seconds on result", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "Promise"] });

    try {
      render(<KioskPage />);
      simulateScan("SB-testqrcode1234");

      await screen.findByText("Juan Dela Cruz");

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
      expect(screen.queryByText("Juan Dela Cruz")).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("auto-resets to scan state after 5 seconds on error", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "Promise"] });

    server.use(
      http.post(
        `${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`,
        () =>
          HttpResponse.json({ message: "Student not found." }, { status: 404 }),
      ),
    );

    try {
      render(<KioskPage />);
      simulateScan("SB-testqrcode1234");

      await screen.findByText(/please see a cashier/i);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows camera access required message when camera is denied", async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    (
      BrowserMultiFormatReader.decodeFromVideoDevice as jest.Mock
    ).mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    render(<KioskPage />);

    expect(
      await screen.findByText(/camera access required/i),
    ).toBeInTheDocument();
  });

  it("ignores QR codes that do not start with SB-", () => {
    render(<KioskPage />);
    simulateScan("INVALID-123");

    // Should stay on scan screen — no loading or result
    expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
    expect(screen.queryByText(/please see a cashier/i)).not.toBeInTheDocument();
  });
});
