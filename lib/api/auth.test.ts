import { http, HttpResponse } from "msw";
import { server } from "@/__tests__/mocks/server";
import { authApi } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL;

describe("authApi", () => {
  it("logout() calls POST /auth/logout and returns void", async () => {
    server.use(
      http.post(
        `${API}/auth/logout`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(authApi.logout()).resolves.toBeUndefined();
  });

  it("user() calls GET /auth/user and returns the user", async () => {
    const mockUser = {
      id: 1,
      full_name: "Test Staff",
      email: "staff@sunbites.test",
      branches: [],
    };

    server.use(http.get(`${API}/auth/user`, () => HttpResponse.json(mockUser)));

    await expect(authApi.user()).resolves.toEqual(mockUser);
  });
});
