import { beforeEach, describe, expect, it, vi } from "vitest";
import { Constants } from "@/integrations/supabase/types";

// Stand-in for the Supabase query builder used by checkAndAwardBadge:
// from("user_badges").select().eq().eq().single()  and  from("user_badges").insert().
// The real client is mocked so these tests need no environment variables or network.
const h = vi.hoisted(() => {
  const single = vi.fn();
  const insert = vi.fn();
  const chain = { select: vi.fn(), eq: vi.fn(), single, insert };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return { single, insert, chain, success: vi.fn() };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => h.chain },
}));
vi.mock("sonner", () => ({ toast: { success: h.success } }));

import { BADGE_INFO, checkAndAwardBadge } from "@/lib/badgeUtils";

describe("BADGE_INFO", () => {
  it("covers exactly the badge_type values the database enum defines", () => {
    // Guards against code and schema drifting apart: a badge the UI knows but the database
    // rejects (or the reverse) would fail at runtime for users.
    expect(Object.keys(BADGE_INFO).sort()).toEqual([...Constants.public.Enums.badge_type].sort());
  });

  it("gives every badge a name, description and icon", () => {
    for (const [type, info] of Object.entries(BADGE_INFO)) {
      expect(info.name, `${type} name`).not.toBe("");
      expect(info.description, `${type} description`).not.toBe("");
      expect(info.icon, `${type} icon`).not.toBe("");
    }
  });
});

describe("checkAndAwardBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("awards a badge the user does not have yet and announces it", async () => {
    h.single.mockResolvedValue({ data: null });
    h.insert.mockResolvedValue({ error: null });

    await expect(checkAndAwardBadge("u1", "first_exam")).resolves.toBe(true);

    expect(h.insert).toHaveBeenCalledWith({ user_id: "u1", badge_type: "first_exam" });
    expect(h.success).toHaveBeenCalledTimes(1);
  });

  it("does not award the same badge twice", async () => {
    h.single.mockResolvedValue({ data: { id: "existing" } });

    await expect(checkAndAwardBadge("u1", "first_exam")).resolves.toBe(false);

    expect(h.insert).not.toHaveBeenCalled();
    expect(h.success).not.toHaveBeenCalled();
  });

  it("returns false and stays silent when saving the badge fails", async () => {
    h.single.mockResolvedValue({ data: null });
    h.insert.mockResolvedValue({ error: new Error("insert failed") });

    await expect(checkAndAwardBadge("u1", "first_exam")).resolves.toBe(false);

    expect(h.success).not.toHaveBeenCalled();
  });
});
