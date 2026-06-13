import { render, screen, waitFor } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";

import { NotificationItem } from "./notification-item";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const announcementUnread = {
  id: "1",
  type: "App\\Notifications\\AnnouncementNotification" as const,
  data: {
    announcement_id: 10,
    title: "School Holiday",
    message: "Classes are suspended on June 20.",
    sender_name: "Jhersonn Cayao",
    sent_at: "2026-06-13T10:00:00Z",
  },
  read_at: null,
  created_at: "2026-06-13T10:00:00Z",
};

const preRegRead = {
  id: "2",
  type: "App\\Notifications\\PreRegistrationNotification" as const,
  data: {
    pre_registration_id: 5,
    student_name: "Juan dela Cruz",
    branch_name: "Iloilo Branch",
    enrollment_type: "Subscription",
    submitted_at: "2026-06-13T08:00:00Z",
  },
  read_at: "2026-06-13T09:00:00Z",
  created_at: "2026-06-13T08:00:00Z",
};

const noop = jest.fn();

describe("NotificationItem (POS)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders unread announcement with bold title", () => {
    render(
      <NotificationItem
        notification={announcementUnread}
        onMarkRead={noop}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
      />
    );
    expect(screen.getByText("School Holiday")).toHaveClass("font-semibold");
    expect(screen.getByText(/Classes are suspended/)).toBeInTheDocument();
  });

  it("renders read pre-registration with muted title", () => {
    render(
      <NotificationItem
        notification={preRegRead}
        onMarkRead={noop}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
      />
    );
    expect(screen.getByText("New Pre-Registration")).toHaveClass("text-muted-foreground");
  });

  it("clicking unread announcement calls onMarkRead, navigates, calls onNavigate", async () => {
    const onMarkRead = jest.fn();
    const onNavigate = jest.fn();
    render(
      <NotificationItem
        notification={announcementUnread}
        onMarkRead={onMarkRead}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
        onNavigate={onNavigate}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /school holiday/i }));
    expect(onMarkRead).toHaveBeenCalledWith("1");
    expect(mockPush).toHaveBeenCalledWith("/announcements/10");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("clicking read pre-registration does NOT call onMarkRead, navigates to pre-registration", async () => {
    const onMarkRead = jest.fn();
    render(
      <NotificationItem
        notification={preRegRead}
        onMarkRead={onMarkRead}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /new pre-registration/i }));
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/pre-registrations/5");
  });

  it("shows Mark as read in ··· menu only when unread", async () => {
    render(
      <NotificationItem
        notification={announcementUnread}
        onMarkRead={noop}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Notification actions" }));
    await waitFor(() => {
      expect(screen.getByText("Mark as read")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  it("does not show Mark as read when already read", async () => {
    render(
      <NotificationItem
        notification={preRegRead}
        onMarkRead={noop}
        onDelete={noop}
        isMarkingRead={false}
        isDeleting={false}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Notification actions" }));
    await waitFor(() => {
      expect(screen.queryByText("Mark as read")).not.toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });
});
