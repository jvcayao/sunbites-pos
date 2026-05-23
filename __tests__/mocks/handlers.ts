import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const staffUserFixture = {
  id: 1,
  first_name: "Juan",
  last_name: "Dela Cruz",
  full_name: "Juan Dela Cruz",
  middle_name: null,
  nickname: null,
  email: "juan@sunbites.test",
  birthday: null,
  gender: null,
  civil_status: null,
  has_photo: false,
  phone: "09171234567",
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  address_line: null,
  city: null,
  province: null,
  zip_code: null,
  position: "Cashier Staff",
  employment_type: "full_time",
  date_hired: "2024-01-15",
  daily_rate: "600.00",
  is_active: true,
  roles: ["cashier"],
  branches: [{ id: 1, name: "Main Branch", slug: "main-branch" }],
  sss_number: null,
  pagibig_number: null,
  philhealth_number: null,
  tin_number: null,
};

export const branchesFixture = [
  { id: 1, name: "Main Branch", slug: "main-branch" },
  { id: 2, name: "South Branch", slug: "south-branch" },
];

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

  http.get(`${API}/users`, () =>
    HttpResponse.json({
      data: [staffUserFixture],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 1,
        from: 1,
        to: 1,
      },
    })
  ),

  http.get(`${API}/users/:id`, () => HttpResponse.json(staffUserFixture)),

  http.post(`${API}/users`, () =>
    HttpResponse.json({ ...staffUserFixture, id: 2 }, { status: 201 })
  ),

  http.put(`${API}/users/:id`, () => HttpResponse.json(staffUserFixture)),

  http.post(`${API}/users/:id/deactivate`, () =>
    HttpResponse.json({ message: "User deactivated." })
  ),

  http.post(`${API}/users/:id/reactivate`, () =>
    HttpResponse.json({ ...staffUserFixture, is_active: true })
  ),

  http.post(`${API}/users/:id/reset-password`, () =>
    HttpResponse.json({ message: "Password reset email sent." })
  ),

  http.get(`${API}/branches`, () => HttpResponse.json(branchesFixture)),
];
