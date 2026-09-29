// Pure request/response helpers shared by the edge functions. No imports on purpose: the same
// file runs in Deno (edge functions) and in Vitest (unit tests, see http.test.ts).

export const GENERIC_ERROR = "Something went wrong. Please try again.";

// Used when the ALLOWED_ORIGINS secret is not set, so local development works out of the box.
const DEV_ORIGIN = "http://localhost:8080";

// Extracts the token from an "Authorization: Bearer <token>" header, or null if absent/malformed.
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token === "" ? null : token;
}

// Parses the comma-separated ALLOWED_ORIGINS secret into a clean list.
export function parseAllowedOrigins(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
}

// CORS headers for one request. The caller's origin is echoed back only when it is on the
// allowlist; there is never a wildcard. Browsers block cross-origin reads when the header is
// missing, which is the intended result for any other site.
export function corsHeadersFor(origin: string | null, allowed: string[]): Record<string, string> {
  const list = allowed.length > 0 ? allowed : [DEV_ORIGIN];
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
  if (origin && list.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// True only for a non-empty string no longer than `max` characters. Used to reject oversized
// or missing input before any paid work happens.
export function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim() !== "" && value.length <= max;
}

export function jsonResponse(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
