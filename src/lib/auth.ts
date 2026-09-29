import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Thin wrappers over Supabase's built-in auth (email and password, Google). Called by
// src/pages/Auth.tsx. They validate input first, translate Supabase's error text into
// messages a user can act on, and never throw: callers get a result they can show as a toast.
//
// Results are plain objects with a `message` that is "" on success. They are deliberately not a
// discriminated union: this project compiles with strictNullChecks off, where TypeScript cannot
// narrow a `true | false` union, so a union would not type-check at the call sites.

export type AuthResult = { ok: boolean; message: string };
export type SignUpResult = { ok: boolean; message: string; needsEmailConfirmation: boolean };

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

const succeeded = (): AuthResult => ({ ok: true, message: "" });
const failed = (message: string): AuthResult => ({ ok: false, message });
const signUpFailed = (message: string): SignUpResult => ({ ok: false, message, needsEmailConfirmation: false });

export function friendlyAuthError(message: string): string {
  if (message.includes("already registered")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password. Please try again.";
  }
  return message;
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<SignUpResult> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return signUpFailed(email.error.errors[0].message);
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return signUpFailed(password.error.errors[0].message);

  // The name is optional; when given it must be a real one. It travels as user metadata so the
  // database trigger that creates the profile row can copy it.
  const trimmedName = input.fullName.trim();
  if (trimmedName !== "") {
    const name = nameSchema.safeParse(trimmedName);
    if (!name.success) return signUpFailed(name.error.errors[0].message);
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: trimmedName === "" ? {} : { full_name: trimmedName },
    },
  });
  if (error) return signUpFailed(friendlyAuthError(error.message));

  // With email confirmation off Supabase returns a session straight away. Without one the user
  // still has to click the link in the email.
  return { ok: true, message: "", needsEmailConfirmation: data.session === null };
}

export async function signInWithEmail(input: { email: string; password: string }): Promise<AuthResult> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return failed(email.error.errors[0].message);
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return failed(password.error.errors[0].message);

  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });
  if (error) return failed(friendlyAuthError(error.message));
  return succeeded();
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) return failed(friendlyAuthError(error.message));
  return succeeded();
}

export async function sendPasswordReset(emailInput: string): Promise<AuthResult> {
  const email = emailSchema.safeParse(emailInput);
  if (!email.success) return failed(email.error.errors[0].message);

  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${window.location.origin}/auth`,
  });
  if (error) return failed(friendlyAuthError(error.message));
  return succeeded();
}
