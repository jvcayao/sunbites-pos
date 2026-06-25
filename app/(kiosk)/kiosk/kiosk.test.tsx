import { act, render, screen } from "@/__tests__/test-utils";
import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import KioskPage from "./page";

// Mock canvas-confetti — no real canvas in jsdom
jest.mock("canvas-confetti", () => jest.fn());

// Mock @zxing/browser — camera does not work in jsdom
let capturedScanCallback:
  | ((result: { getText: () => string } | null) => void)
  | null = null;

// BrowserMultiFormatReader is an instance-based class in @zxing/browser v0.2.x.
// The constructor mock returns an object whose decodeFromVideoDevice captures
// the scan callback so tests can simulate QR scans via simulateScan().
jest.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
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
  })),
}));

const simulateScan = (qrCode: string) => {
  act(() => {
    capturedScanCallback?.({ getText: () => qrCode });
  });
};

const simulateKeyboardScan = (code: string) => {
  act(() => {
    for (const char of code) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: char }));
    }
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  });
};

describe("KioskPage", () => {
  beforeEach(async () => {
    capturedScanCallback = null;
    // Reset the @zxing/browser mock to default successful implementation
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    (BrowserMultiFormatReader as unknown as jest.Mock).mockImplementation(
      () => ({
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
      }),
    );
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
    // balance: "245.00" — count-up ends at ₱245.00
    expect(await screen.findByText("₱245.00")).toBeInTheDocument();
    expect(screen.getByText("Rice Meal, Water")).toBeInTheDocument();
  });

  it("shows green balance color for amount >= 150", async () => {
    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    // Default mock returns balance: "245.00" which is green (>= 150)
    const balance = await screen.findByText("₱245.00");
    expect(balance).toHaveClass("text-green-600");
  });

  it("shows orange balance for amount between 80 and 149", async () => {
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
        HttpResponse.json({
          name: "Juan Dela Cruz",
          initials: "JD",
          grade_level: "Grade 3",
          student_type: "subscription",
          balance: "100.00",
          last_orders: [],
        }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    const balance = await screen.findByText("₱100.00");
    expect(balance).toHaveClass("text-orange-500");
  });

  it("shows red balance for amount <= 79", async () => {
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
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
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
        HttpResponse.json({ message: "Student not found." }, { status: 404 }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    expect(
      await screen.findByText(/please see a cashier/i),
    ).toBeInTheDocument();
  });

  it("shows the same error card for 403 (restricted student)", async () => {
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
        HttpResponse.json(
          { message: "Student is not eligible." },
          { status: 403 },
        ),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    expect(
      await screen.findByText(/please see a cashier/i),
    ).toBeInTheDocument();
  });

  it("auto-resets to scan state after 10 seconds on result", async () => {
    jest.useFakeTimers({
      doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
    });

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
    jest.useFakeTimers({
      doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
    });

    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
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

  it("shows 'Use your camera' button when camera is denied", async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    (BrowserMultiFormatReader as unknown as jest.Mock).mockImplementationOnce(
      () => ({
        decodeFromVideoDevice: jest
          .fn()
          .mockRejectedValueOnce(
            new DOMException("Permission denied", "NotAllowedError"),
          ),
      }),
    );

    render(<KioskPage />);

    expect(
      await screen.findByRole("button", { name: /use your camera/i }),
    ).toBeInTheDocument();
    // Scan prompt remains — kiosk is still functional for hardware scanners
    expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
  });

  it("hardware scanner works when camera is blocked", async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    (BrowserMultiFormatReader as unknown as jest.Mock).mockImplementationOnce(
      () => ({
        decodeFromVideoDevice: jest
          .fn()
          .mockRejectedValueOnce(
            new DOMException("Permission denied", "NotAllowedError"),
          ),
      }),
    );

    render(<KioskPage />);

    // Wait for camera to fail and cameraBlocked to be set
    await screen.findByRole("button", { name: /use your camera/i });

    // Simulate hardware QR scanner via keyboard input
    simulateKeyboardScan("SB-testqrcode1234");

    // Student card should appear — keyboard scanner was not silenced by camera failure
    expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
  });

  it("'Use your camera' button re-triggers camera access on click", async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const constructorMock = BrowserMultiFormatReader as unknown as jest.Mock;
    constructorMock.mockImplementation(() => ({
      decodeFromVideoDevice: jest
        .fn()
        .mockRejectedValue(
          new DOMException("Permission denied", "NotAllowedError"),
        ),
    }));

    render(<KioskPage />);

    // Wait for first camera failure — button appears
    const retryButton = await screen.findByRole("button", {
      name: /use your camera/i,
    });
    const callCountAfterInit = constructorMock.mock.calls.length;

    // Click retry
    act(() => {
      retryButton.click();
    });

    // Camera effect re-runs — BrowserMultiFormatReader constructor is called again
    await screen.findByRole("button", { name: /use your camera/i });
    expect(constructorMock.mock.calls.length).toBeGreaterThan(
      callCountAfterInit,
    );
  });

  it("scan guide remains visible and video is hidden when camera is blocked", async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    (BrowserMultiFormatReader as unknown as jest.Mock).mockImplementationOnce(
      () => ({
        decodeFromVideoDevice: jest
          .fn()
          .mockRejectedValueOnce(
            new DOMException("Permission denied", "NotAllowedError"),
          ),
      }),
    );

    const { container } = render(<KioskPage />);

    // Wait for camera to fail
    await screen.findByRole("button", { name: /use your camera/i });

    // Scan guide is visible — hardware scanner can still be used
    expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();

    // Video element has the hidden class in camera-blocked mode
    const video = container.querySelector("video");
    expect(video).toHaveClass("hidden");
  });

  it("ignores QR codes that do not start with SB-", () => {
    render(<KioskPage />);
    simulateScan("INVALID-123");

    expect(screen.getByText(/scan your id card/i)).toBeInTheDocument();
    expect(screen.queryByText(/please see a cashier/i)).not.toBeInTheDocument();
  });

  // ── Tier-specific emoji and message tests ───────────────────────────────

  it("shows no tier message for green balance (>= 150)", async () => {
    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    await screen.findByText("Juan Dela Cruz");

    expect(screen.queryByText(/running low/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/insufficient balance/i)).not.toBeInTheDocument();
  });

  it("shows sad emoji and running low message for orange balance (80-149)", async () => {
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
        HttpResponse.json({
          name: "Juan Dela Cruz",
          initials: "JD",
          grade_level: "Grade 3",
          student_type: "subscription",
          balance: "100.00",
          last_orders: [],
        }),
      ),
    );

    render(<KioskPage />);
    simulateScan("SB-testqrcode1234");

    await screen.findByText("Juan Dela Cruz");

    expect(screen.getByText("😢")).toBeInTheDocument();
    expect(
      screen.getByText("Your balance is running low. Please top up soon!"),
    ).toBeInTheDocument();
  });

  it("shows worried emoji and insufficient balance message for red balance (<= 79)", async () => {
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/public/kiosk/lookup`, () =>
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

    await screen.findByText("Juan Dela Cruz");

    expect(screen.getByText("😰")).toBeInTheDocument();
    expect(
      screen.getByText("Insufficient balance. Please top up before ordering."),
    ).toBeInTheDocument();
  });
});
