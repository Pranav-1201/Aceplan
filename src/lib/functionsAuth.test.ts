import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: h.getSession } },
}));

import { authHeaders } from "@/lib/functionsAuth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-anon-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authHeaders", () => {
  it("sends the signed-in user's token as the bearer, never the public key", async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: "user-token" } } });

    const headers = await authHeaders();

    expect(headers.Authorization).toBe("Bearer user-token");
    expect(headers.Authorization).not.toContain("public-anon-key");
    expect(headers.apikey).toBe("public-anon-key");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a readable message when nobody is signed in", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });

    await expect(authHeaders()).rejects.toThrow("Please sign in to use this feature.");
  });
});
