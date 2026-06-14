import "@testing-library/jest-dom";
import { server } from "./__tests__/mocks/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";

// Polyfill PointerEvent for @base-ui components in jsdom
if (
  typeof window !== "undefined" &&
  typeof window.PointerEvent === "undefined"
) {
  class PointerEvent extends MouseEvent {
    pointerId?: number;
    width?: number;
    height?: number;
    pressure?: number;
    pointerType?: string;
    isPrimary?: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId;
      this.width = init.width;
      this.height = init.height;
      this.pressure = init.pressure;
      this.pointerType = init.pointerType;
      this.isPrimary = init.isPrimary;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.PointerEvent = PointerEvent as any;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
