import { http, HttpResponse } from "msw";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { server } from "@/__tests__/mocks/server";

import NotificationsPage from "./page";

const API = "http://localhost:8000";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockAuthState = {
  user: { id: 1, name: "Admin" },
  token: null,
  activeBranch: null,
};
jest.mock("@/lib/store/auth", () => ({
  useAuthStore: Object.assign(
    (sel: (s: typeof mockAuthState) => unknown) => sel(mockAuthState),
    {
      getState: () => mockAuthState,
    },
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const announcementFixture = {
  id: "notif-a1",
  type: "App\\Notifications\\AnnouncementNotification",
  data: {
    announcement_id: 3,
    title: "Canteen closure Friday",
    message: "Canteen will be closed on Friday for maintenance.",
    sender_name: "Admin User",
    sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  read_at: null,
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

const preRegFixture = {
  id: "notif-p1",
  type: "App\\Notifications\\PreRegistrationNotification",
  data: {
    pre_registration_id: 12,
    student_name: "Jose Reyes",
    branch_name: "Iloilo Branch",
    enrollment_type: "subscription",
    submitted_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  read_at: null,
  created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};

const emptyListResponse = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
};

const listWithBothResponse = {
  data: [announcementFixture, preRegFixture],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
};

// ---------------------------------------------------------------------------
// Default per-test handlers
// ---------------------------------------------------------------------------

function useDefaultHandlers() {
  server.use(
    http.get(`${API}/staff/notifications`, () =>
      HttpResponse.json(listWithBothResponse),
    ),
    http.get(`${API}/staff/notifications/unread-count`, () =>
      HttpResponse.json({ count: 2 }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockPush.mockClear();
  useDefaultHandlers();
});

describe("NotificationsPage (POS)", () => {
  it("renders an announcement notification with its title and message preview", async () => {
    render(<NotificationsPage />);

    expect(
      await screen.findByText("Canteen closure Friday"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Canteen will be closed on Friday for maintenance."),
    ).toBeInTheDocument();
  });

  it("renders a pre-registration notification with 'New Pre-Registration' title and formatted preview", async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText("New Pre-Registration")).toBeInTheDocument();

    expect(
      screen.getByText("Jose Reyes — subscription · Iloilo Branch"),
    ).toBeInTheDocument();
  });

  it("clicking an announcement opens the sheet and the view button navigates", async () => {
    server.use(
      http.patch(`${API}/staff/notifications/notif-a1/read`, () =>
        HttpResponse.json({ message: "Marked as read." }),
      ),
    );

    render(<NotificationsPage />);

    const item = await screen.findByRole("button", {
      name: /canteen closure friday/i,
    });

    await userEvent.click(item);

    const viewBtn = await screen.findByRole("button", {
      name: /view announcement/i,
    });
    await userEvent.click(viewBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/announcements/3");
    });
  });

  it("clicking a pre-registration opens the sheet and the view button navigates", async () => {
    server.use(
      http.patch(`${API}/staff/notifications/notif-p1/read`, () =>
        HttpResponse.json({ message: "Marked as read." }),
      ),
    );

    render(<NotificationsPage />);

    const item = await screen.findByRole("button", {
      name: /new pre-registration/i,
    });

    await userEvent.click(item);

    const viewBtn = await screen.findByRole("button", {
      name: /view pre-registration/i,
    });
    await userEvent.click(viewBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/pre-registrations/12");
    });
  });

  it("shows empty state when there are no notifications", async () => {
    server.use(
      http.get(`${API}/staff/notifications`, () =>
        HttpResponse.json(emptyListResponse),
      ),
      http.get(`${API}/staff/notifications/unread-count`, () =>
        HttpResponse.json({ count: 0 }),
      ),
    );

    render(<NotificationsPage />);

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it("shows the 'Today' date group header for today's notifications", async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText("Today")).toBeInTheDocument();
  });

  it("Unread tab filters to only unread notifications", async () => {
    server.use(
      http.get(`${API}/staff/notifications`, () =>
        HttpResponse.json({
          data: [
            announcementFixture,
            {
              ...preRegFixture,
              id: "notif-read",
              read_at: new Date().toISOString(),
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
        }),
      ),
      http.get(`${API}/staff/notifications/unread-count`, () =>
        HttpResponse.json({ count: 1 }),
      ),
    );

    render(<NotificationsPage />);

    await screen.findByText("Canteen closure Friday");

    await userEvent.click(screen.getByRole("tab", { name: /unread/i }));

    await waitFor(() => {
      expect(screen.getByText("Canteen closure Friday")).toBeInTheDocument();
      expect(
        screen.queryByText("New Pre-Registration"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows mark-all-read button when unread count > 0", async () => {
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Mark all notifications as read" }),
      ).toBeInTheDocument();
    });
  });

  it("shows clear-all button when notifications exist", async () => {
    render(<NotificationsPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Clear all notifications" }),
      ).toBeInTheDocument();
    });
  });
});
