import { supabase } from "@/integrations/supabase/client";

// Headers for calling our edge functions with fetch. The functions only serve signed-in users, so
// the Authorization header must carry the user's own access token, not the public anon key.
// Used by the AI notes and quiz components. Throws a message fit for a toast when nobody is
// signed in.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Please sign in to use this feature.");
  }

  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
}
