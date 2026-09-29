import { beforeEach, describe, expect, it, vi } from "vitest";

// The real client is replaced so these tests need no environment variables or network.
const h = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: h },
}));

import {
  friendlyAuthError,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth";

const origin = window.location.origin;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signUpWithEmail", () => {
  it("sends the trimmed name as user metadata and the app origin as redirect", async () => {
    h.signUp.mockResolvedValue({ data: { session: {} }, error: null });

    const result = await signUpWithEmail({ email: "a@b.co", password: "secret1", fullName: "  Asha Rao " });

    expect(result).toEqual({ ok: true, message: "", needsEmailConfirmation: false });
    expect(h.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "secret1",
      options: { emailRedirectTo: `${origin}/`, data: { full_name: "Asha Rao" } },
    });
  });

  it("omits the name metadata when no name is given", async () => {
    h.signUp.mockResolvedValue({ data: { session: {} }, error: null });

    await signUpWithEmail({ email: "a@b.co", password: "secret1", fullName: "   " });

    expect(h.signUp.mock.calls[0][0].options.data).toEqual({});
  });

  it("reports that email confirmation is needed when Supabase returns no session", async () => {
    h.signUp.mockResolvedValue({ data: { session: null }, error: null });

    await expect(
      signUpWithEmail({ email: "a@b.co", password: "secret1", fullName: "" }),
    ).resolves.toEqual({ ok: true, message: "", needsEmailConfirmation: true });
  });

  it("rejects bad input without calling Supabase", async () => {
    await expect(signUpWithEmail({ email: "nope", password: "secret1", fullName: "" })).resolves.toEqual({
      ok: false,
      message: "Please enter a valid email address",
      needsEmailConfirmation: false,
    });
    await expect(signUpWithEmail({ email: "a@b.co", password: "123", fullName: "" })).resolves.toEqual({
      ok: false,
      message: "Password must be at least 6 characters",
      needsEmailConfirmation: false,
    });
    await expect(signUpWithEmail({ email: "a@b.co", password: "secret1", fullName: "A" })).resolves.toEqual({
      ok: false,
      message: "Name must be at least 2 characters",
      needsEmailConfirmation: false,
    });
    expect(h.signUp).not.toHaveBeenCalled();
  });

  it("turns 'already registered' into a sign-in hint", async () => {
    h.signUp.mockResolvedValue({ data: { session: null }, error: { message: "User already registered" } });

    await expect(
      signUpWithEmail({ email: "a@b.co", password: "secret1", fullName: "" }),
    ).resolves.toEqual({
      ok: false,
      message: "This email is already registered. Please sign in instead.",
      needsEmailConfirmation: false,
    });
  });
});

describe("signInWithEmail", () => {
  it("succeeds with valid credentials", async () => {
    h.signInWithPassword.mockResolvedValue({ error: null });

    await expect(signInWithEmail({ email: "a@b.co", password: "secret1" })).resolves.toEqual({ ok: true, message: "" });
    expect(h.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "secret1" });
  });

  it("translates invalid credentials", async () => {
    h.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });

    await expect(signInWithEmail({ email: "a@b.co", password: "secret1" })).resolves.toEqual({
      ok: false,
      message: "Invalid email or password. Please try again.",
    });
  });

  it("does not call Supabase for a malformed email", async () => {
    await signInWithEmail({ email: "nope", password: "secret1" });
    expect(h.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signInWithGoogle", () => {
  it("asks for the google provider and returns to the dashboard", async () => {
    h.signInWithOAuth.mockResolvedValue({ error: null });

    await expect(signInWithGoogle()).resolves.toEqual({ ok: true, message: "" });
    expect(h.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${origin}/dashboard` },
    });
  });

  it("surfaces a provider error message", async () => {
    h.signInWithOAuth.mockResolvedValue({ error: { message: "provider is not enabled" } });

    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, message: "provider is not enabled" });
  });
});

describe("sendPasswordReset", () => {
  it("sends the reset link back to the auth page", async () => {
    h.resetPasswordForEmail.mockResolvedValue({ error: null });

    await expect(sendPasswordReset("a@b.co")).resolves.toEqual({ ok: true, message: "" });
    expect(h.resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", { redirectTo: `${origin}/auth` });
  });

  it("rejects a malformed email", async () => {
    await expect(sendPasswordReset("nope")).resolves.toEqual({
      ok: false,
      message: "Please enter a valid email address",
    });
    expect(h.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("friendlyAuthError", () => {
  it("passes unknown messages through unchanged", () => {
    expect(friendlyAuthError("Email rate limit exceeded")).toBe("Email rate limit exceeded");
  });
});
