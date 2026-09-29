// Deno-only helper for the edge functions that spend money (AI). It proves the caller is a
// real signed-in user. A valid JWT alone is not enough: the public anon key is itself a valid
// JWT, so it must be rejected here. The pure parts live in ./http.ts and are unit tested.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bearerToken } from "./http.ts";

export type SignedInUser = {
  user: { id: string; email?: string };
  // A client that acts as this user (row level security applies to everything it does).
  client: ReturnType<typeof createClient>;
};

// Returns the signed-in user and a client acting as them, or null when the request carries no
// token, an invalid token, or a token that does not belong to a user (such as the anon key).
export async function requireUser(req: Request): Promise<SignedInUser | null> {
  const token = bearerToken(req.headers.get("Authorization"));
  if (!token) return null;

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  // getUser asks the auth server to validate the token, so a forged or expired one fails.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return { user: { id: data.user.id, email: data.user.email }, client };
}
