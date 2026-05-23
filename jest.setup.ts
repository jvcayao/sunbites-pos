import "@testing-library/jest-dom";
import { server } from "./__tests__/mocks/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
