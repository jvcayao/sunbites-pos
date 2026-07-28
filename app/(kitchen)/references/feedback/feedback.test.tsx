import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";

import { render, screen, waitFor } from "@/__tests__/test-utils";
import { server } from "@/__tests__/mocks/server";

import FeedbackPage from "./page";

import type { Feedback } from "@/types/feedback";

const API = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const unrepliedFixture: Feedback = {
  id: 1,
  student_id: 10,
  branch_id: 1,
  category: "Service",
  message: "The service was a little slow today.",
  admin_reply: null,
  replied_at: null,
  is_read: false,
  created_at: "2026-07-01T04:00:00.000000Z",
  student: {
    id: 10,
    full_name: "Juan dela Cruz",
    student_number: "STU-0001",
  },
};

const repliedFixture: Feedback = {
  id: 2,
  student_id: 11,
  branch_id: 1,
  category: "FoodQuality",
  message: "The adobo was excellent.",
  admin_reply: "Thank you for letting us know!",
  replied_at: "2026-07-02T04:00:00.000000Z",
  is_read: true,
  created_at: "2026-07-02T02:00:00.000000Z",
  student: {
    id: 11,
    full_name: "Maria Santos",
    student_number: "STU-0002",
  },
};

function listHandler(items: Feedback[]) {
  return http.get(`${API}/references/feedback`, () =>
    HttpResponse.json({
      data: items,
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 25,
        total: items.length,
        from: items.length ? 1 : null,
        to: items.length || null,
      },
    }),
  );
}

function setupList(items: Feedback[] = [unrepliedFixture]) {
  server.use(listHandler(items));
}

/** Opens the detail sheet for the given feedback message. */
async function openDetail(message: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByText(message));
  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeedbackPage", () => {
  it("renders the feedback message and student identity", async () => {
    setupList();
    render(<FeedbackPage />);

    expect(
      await screen.findByText("The service was a little slow today."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Juan dela Cruz \(STU-0001\)/)).toBeInTheDocument();
  });

  it("shows the empty state when there is no feedback", async () => {
    setupList([]);
    render(<FeedbackPage />);

    expect(await screen.findByText("No feedback found.")).toBeInTheDocument();
  });

  it("shows an error message when the list request fails", async () => {
    server.use(
      http.get(`${API}/references/feedback`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );
    render(<FeedbackPage />);

    expect(
      await screen.findByText(/Failed to load feedback/i),
    ).toBeInTheDocument();
  });

  it("marks a replied item with a Replied badge", async () => {
    setupList([repliedFixture]);
    render(<FeedbackPage />);

    expect(await screen.findByText("Replied")).toBeInTheDocument();
  });

  // --- The regression this suite exists for -------------------------------

  it("sends the reply under the 'reply' key the API validates", async () => {
    setupList();
    let body: Record<string, unknown> | null = null;

    server.use(
      http.post(`${API}/references/feedback/1/reply`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 1,
          admin_reply: "We have added more staff during lunch.",
          replied_at: "2026-07-27T04:00:00.000000Z",
        });
      }),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");

    await user.type(
      screen.getByLabelText("Write a Reply"),
      "We have added more staff during lunch.",
    );
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toEqual({ reply: "We have added more staff during lunch." });
  });

  it("shows a success toast and closes the sheet after replying", async () => {
    setupList();
    server.use(
      http.post(`${API}/references/feedback/1/reply`, () =>
        HttpResponse.json({
          id: 1,
          admin_reply: "Thanks for the heads up.",
          replied_at: "2026-07-27T04:00:00.000000Z",
        }),
      ),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");

    await user.type(
      screen.getByLabelText("Write a Reply"),
      "Thanks for the heads up.",
    );
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(await screen.findByText("Reply sent.")).toBeInTheDocument();
  });

  it("surfaces the API error message when the reply is rejected", async () => {
    setupList();
    server.use(
      http.post(`${API}/references/feedback/1/reply`, () =>
        HttpResponse.json(
          { message: "The reply field is required." },
          { status: 422 },
        ),
      ),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");

    await user.type(
      screen.getByLabelText("Write a Reply"),
      "A perfectly valid reply.",
    );
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(
      await screen.findByText("The reply field is required."),
    ).toBeInTheDocument();
  });

  // --- Client-side validation mirrors the API rules -----------------------

  it("blocks an empty reply without calling the API", async () => {
    setupList();
    let called = false;
    server.use(
      http.post(`${API}/references/feedback/1/reply`, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reply cannot be empty.",
    );
    expect(called).toBe(false);
  });

  it("blocks a reply shorter than the API minimum of 5 characters", async () => {
    setupList();
    let called = false;
    server.use(
      http.post(`${API}/references/feedback/1/reply`, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");

    await user.type(screen.getByLabelText("Write a Reply"), "Ok");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reply must be at least 5 characters.",
    );
    expect(called).toBe(false);
  });

  // --- Mark as read --------------------------------------------------------

  it("marks unread feedback as read", async () => {
    setupList();
    let called = false;
    server.use(
      http.patch(`${API}/references/feedback/1/mark-read`, () => {
        called = true;
        return HttpResponse.json({ message: "Feedback marked as read." });
      }),
    );

    render(<FeedbackPage />);
    const user = await openDetail("The service was a little slow today.");
    await user.click(screen.getByRole("button", { name: "Mark as Read" }));

    await waitFor(() => expect(called).toBe(true));
    expect(await screen.findByText("Marked as read.")).toBeInTheDocument();
  });

  // --- Search --------------------------------------------------------------

  it("forwards the search term to the API as a 'search' query param", async () => {
    const requestedUrls: string[] = [];
    server.use(
      http.get(`${API}/references/feedback`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json({
          data: [unrepliedFixture],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: 1,
            from: 1,
            to: 1,
          },
        });
      }),
    );

    render(<FeedbackPage />);
    await screen.findByText("The service was a little slow today.");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search feedback" }),
      "adobo",
    );

    await waitFor(() => {
      expect(
        requestedUrls.some((url) =>
          new URL(url).searchParams.get("search")?.includes("adobo"),
        ),
      ).toBe(true);
    });
  });
});
