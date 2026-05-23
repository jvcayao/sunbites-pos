import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const handlers = [
  http.post(`${API}/auth/login`, () =>
    HttpResponse.json({
      token: "test-sanctum-token",
      user: {
        id: 1,
        full_name: "Test Staff",
        email: "staff@sunbites.test",
        branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
      },
    })
  ),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
];
