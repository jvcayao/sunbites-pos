import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/__tests__/mocks/server";
import { NotificationBell } from "./notification-bell";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

jest.mock("@/components/providers/echo-provider", () => ({
  useEcho: () => null,
}));
const mockAuthState = { user: { id: 1, name: "Admin" }, token: null, activeBranch: null };
jest.mock("@/lib/store/auth", () => ({
  useAuthStore: Object.assign(
    (sel: (s: any) => any) => sel(mockAuthState),
    { getState: () => mockAuthState }
  ),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function setupHandlers(count: number, items: any[] = []) {
  server.use(
    http.get(`${API}/staff/notifications/unread-count`, () =>
      HttpResponse.json({ count })
    ),
    http.get(`${API}/staff/notifications`, () =>
      HttpResponse.json({
        data: items,
        meta: { current_page: 1, last_page: 1, per_page: 20, total: items.length },
      })
    )
  );
}

describe("NotificationBell (POS)", () => {
  it("renders bell button without badge when unread count is 0", async () => {
    setupHandlers(0);
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    });
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("renders badge with unread count when count > 0", async () => {
    setupHandlers(3);
    render(<NotificationBell />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "3 unread notifications" })
      ).toBeInTheDocument();
    });
  });

  it("clicking bell opens the notification panel", async () => {
    setupHandlers(0, []);
    render(<NotificationBell />);
    await waitFor(() => screen.getByRole("button", { name: "Notifications" }));
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() => {
      expect(screen.getByText("View all notifications →")).toBeInTheDocument();
    });
  });

  it("shows empty state when notification list is empty", async () => {
    setupHandlers(0, []);
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() => {
      expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    });
  });

  it("shows mark-all-read button only when unread count > 0", async () => {
    setupHandlers(2, []);
    render(<NotificationBell />);
    await waitFor(() => screen.getByRole("button", { name: "2 unread notifications" }));
    await userEvent.click(screen.getByRole("button", { name: "2 unread notifications" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
    });
  });
});
