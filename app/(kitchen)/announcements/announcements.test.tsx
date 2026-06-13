import { http, HttpResponse } from "msw";

import { render, screen } from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";

import AnnouncementsPage from "./page";

const API = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const parentsFixture = {
  id: 1,
  title: "Canteen Closed Friday",
  message_preview: "The canteen will be closed on Friday for maintenance.",
  sender_name: "Admin User",
  recipient_type: "parents" as const,
  recipient_count: 48,
  read_count: 31,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const staffFixture = {
  id: 2,
  title: "New Menu Items",
  message_preview: "Three new items added to the weekly lunch menu.",
  sender_name: "Manager",
  recipient_type: "staff" as const,
  recipient_count: 12,
  read_count: 10,
  created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
};

function setupHandlers(announcements: unknown[]) {
  server.use(
    http.get(`${API}/announcements`, () =>
      HttpResponse.json({
        data: announcements,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: announcements.length,
        },
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnnouncementsPage", () => {
  it("renders announcement title and message preview", async () => {
    setupHandlers([parentsFixture]);

    render(<AnnouncementsPage />);

    expect(await screen.findByText("Canteen Closed Friday")).toBeInTheDocument();
    expect(
      screen.getByText("The canteen will be closed on Friday for maintenance.")
    ).toBeInTheDocument();
  });

  it("shows 'Parents' badge for parents recipient type", async () => {
    setupHandlers([parentsFixture]);

    render(<AnnouncementsPage />);

    expect(await screen.findByText("Parents")).toBeInTheDocument();
  });

  it("shows 'Staff' badge for staff recipient type", async () => {
    setupHandlers([staffFixture]);

    render(<AnnouncementsPage />);

    expect(await screen.findByText("Staff")).toBeInTheDocument();
  });

  it("shows sent and read counts in the stats line", async () => {
    setupHandlers([parentsFixture]);

    render(<AnnouncementsPage />);

    expect(
      await screen.findByText(/by Admin User · 48 sent · 31 read/)
    ).toBeInTheDocument();
  });

  it("shows 'Today' date group header for today's announcements", async () => {
    setupHandlers([parentsFixture]);

    render(<AnnouncementsPage />);

    expect(await screen.findByText("Today")).toBeInTheDocument();
  });

  it("shows empty state when there are no announcements", async () => {
    setupHandlers([]);

    render(<AnnouncementsPage />);

    expect(await screen.findByText("No announcements yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first announcement to notify parents or staff.")
    ).toBeInTheDocument();
  });
});
