import { http, HttpResponse } from "msw";
import React from "react";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { server } from "@/__tests__/mocks/server";

// Mock Base UI Select to avoid portal rendering issues in jsdom
jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label="Filter by audience"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

import AnnouncementsPage from "./page";

const API = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function todayNoon(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

const parentsFixture = {
  id: 1,
  title: "Canteen Closed Friday",
  message_preview: "The canteen will be closed on Friday for maintenance.",
  sender_name: "Admin User",
  recipient_type: "parents" as const,
  recipient_count: 48,
  read_count: 31,
  created_at: todayNoon(),
};

const staffFixture = {
  id: 2,
  title: "New Menu Items",
  message_preview: "Three new items added to the weekly lunch menu.",
  sender_name: "Manager",
  recipient_type: "staff" as const,
  recipient_count: 12,
  read_count: 10,
  created_at: todayNoon(),
};

function setupHandlers(announcements: unknown[]) {
  server.use(
    http.get(`${API}/announcements`, () =>
      HttpResponse.json({
        data: announcements,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 50,
          total: announcements.length,
        },
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnnouncementsPage", () => {
  it("renders announcement title and message preview", async () => {
    setupHandlers([parentsFixture]);
    render(<AnnouncementsPage />);
    expect(
      await screen.findByText("Canteen Closed Friday"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The canteen will be closed on Friday for maintenance."),
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

  it("shows sender name, sent and read counts in the meta row", async () => {
    setupHandlers([parentsFixture]);
    render(<AnnouncementsPage />);
    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("48 sent")).toBeInTheDocument();
      expect(screen.getByText("31 read")).toBeInTheDocument();
    });
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
  });

  it("announcement card links to detail page", async () => {
    setupHandlers([parentsFixture]);
    render(<AnnouncementsPage />);
    await screen.findByText("Canteen Closed Friday");
    expect(
      screen.getByRole("link", { name: "Canteen Closed Friday" }),
    ).toHaveAttribute("href", "/announcements/1");
  });

  it("search filters announcements by title", async () => {
    setupHandlers([parentsFixture, staffFixture]);
    render(<AnnouncementsPage />);
    await screen.findByText("Canteen Closed Friday");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search announcements" }),
      "canteen",
    );

    await waitFor(() => {
      expect(screen.getByText("Canteen Closed Friday")).toBeInTheDocument();
      expect(screen.queryByText("New Menu Items")).not.toBeInTheDocument();
    });
  });

  it("audience filter hides announcements that don't match", async () => {
    setupHandlers([parentsFixture, staffFixture]);
    render(<AnnouncementsPage />);
    await screen.findByText("New Menu Items");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Filter by audience" }),
      "parents",
    );

    await waitFor(() => {
      expect(screen.getByText("Canteen Closed Friday")).toBeInTheDocument();
      expect(screen.queryByText("New Menu Items")).not.toBeInTheDocument();
    });
  });

  it("shows filtered empty state when no results match the search", async () => {
    setupHandlers([parentsFixture]);
    render(<AnnouncementsPage />);
    await screen.findByText("Canteen Closed Friday");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search announcements" }),
      "zzznomatch",
    );

    expect(
      await screen.findByText("No announcements match your filters"),
    ).toBeInTheDocument();
  });
});
