import { http, HttpResponse } from "msw";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";

import StaffNotificationsPage from "./page";

const API = "http://localhost:8000";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
  meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
};

const listWithBothResponse = {
  data: [announcementFixture, preRegFixture],
  meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
};

// ---------------------------------------------------------------------------
// Default per-test handlers
// ---------------------------------------------------------------------------

function useDefaultHandlers() {
  server.use(
    http.get(`${API}/staff/notifications`, () =>
      HttpResponse.json(listWithBothResponse)
    ),
    http.get(`${API}/staff/notifications/unread-count`, () =>
      HttpResponse.json({ count: 2 })
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockPush.mockClear();
  useDefaultHandlers();
});

describe("StaffNotificationsPage", () => {
  it("renders an announcement notification with its title and message preview", async () => {
    render(<StaffNotificationsPage />);

    expect(
      await screen.findByText("Canteen closure Friday")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Canteen will be closed on Friday for maintenance.")
    ).toBeInTheDocument();
  });

  it("renders a pre-registration notification with 'New Pre-Registration' title and formatted preview", async () => {
    render(<StaffNotificationsPage />);

    expect(
      await screen.findByText("New Pre-Registration")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Jose Reyes — subscription at Iloilo Branch")
    ).toBeInTheDocument();
  });

  it("clicking an announcement card navigates to /announcements/{id}", async () => {
    server.use(
      http.patch(`${API}/staff/notifications/notif-a1/read`, () =>
        HttpResponse.json({ message: "Marked as read." })
      )
    );

    render(<StaffNotificationsPage />);

    const card = await screen.findByRole("article", {
      name: "Canteen closure Friday",
    });

    card.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/announcements/3");
    });
  });

  it("clicking a pre-registration card navigates to /pre-registrations/{id}", async () => {
    server.use(
      http.patch(`${API}/staff/notifications/notif-p1/read`, () =>
        HttpResponse.json({ message: "Marked as read." })
      )
    );

    render(<StaffNotificationsPage />);

    const card = await screen.findByRole("article", {
      name: "New Pre-Registration",
    });

    card.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/pre-registrations/12");
    });
  });

  it("shows empty state when there are no notifications", async () => {
    server.use(
      http.get(`${API}/staff/notifications`, () =>
        HttpResponse.json(emptyListResponse)
      ),
      http.get(`${API}/staff/notifications/unread-count`, () =>
        HttpResponse.json({ count: 0 })
      )
    );

    render(<StaffNotificationsPage />);

    expect(
      await screen.findByText("You're all caught up")
    ).toBeInTheDocument();
  });
});
