// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  GENERIC_ERROR,
  bearerToken,
  corsHeadersFor,
  isText,
  jsonResponse,
  parseAllowedOrigins,
  parseLimit,
} from "./http";

describe("bearerToken", () => {
  it("extracts the token from a Bearer header, ignoring case and padding", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer   abc  ")).toBe("abc");
  });

  it("returns null for missing or malformed headers", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
    expect(bearerToken("abc")).toBeNull();
  });
});

describe("parseAllowedOrigins", () => {
  it("splits, trims and drops empties", () => {
    expect(parseAllowedOrigins("https://a.app, https://b.app ,,")).toEqual(["https://a.app", "https://b.app"]);
  });

  it("returns an empty list when unset", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins("")).toEqual([]);
  });
});

describe("corsHeadersFor", () => {
  it("echoes an allowed origin", () => {
    const headers = corsHeadersFor("https://a.app", ["https://a.app"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://a.app");
  });

  it("does not grant an origin that is not on the list, and never uses a wildcard", () => {
    const headers = corsHeadersFor("https://evil.example", ["https://a.app"]);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(Object.values(headers)).not.toContain("*");
  });

  it("does not grant anything when the request has no Origin header", () => {
    expect(corsHeadersFor(null, ["https://a.app"])["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("falls back to the local dev origin when no allowlist is configured", () => {
    expect(corsHeadersFor("http://localhost:8080", [])["Access-Control-Allow-Origin"]).toBe("http://localhost:8080");
    expect(corsHeadersFor("https://a.app", [])["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("always varies on Origin so caches do not mix responses", () => {
    expect(corsHeadersFor("https://a.app", ["https://a.app"]).Vary).toBe("Origin");
    expect(corsHeadersFor("https://evil.example", ["https://a.app"]).Vary).toBe("Origin");
  });
});

describe("parseLimit", () => {
  it("reads a positive whole number", () => {
    expect(parseLimit("25", 50)).toBe(25);
    expect(parseLimit(" 7 ", 50)).toBe(7);
  });

  it("falls back for unset, blank, non-numeric, fractional, zero and negative values", () => {
    for (const raw of [undefined, null, "", "  ", "abc", "2.5", "0", "-3"]) {
      expect(parseLimit(raw, 50), String(raw)).toBe(50);
    }
  });
});

describe("isText", () => {
  it("accepts a non-empty string within the limit, including exactly the limit", () => {
    expect(isText("hello", 5)).toBe(true);
  });

  it("rejects too long, empty, blank and non-string values", () => {
    expect(isText("hello!", 5)).toBe(false);
    expect(isText("", 5)).toBe(false);
    expect(isText("   ", 5)).toBe(false);
    expect(isText(42, 5)).toBe(false);
    expect(isText(null, 5)).toBe(false);
    expect(isText(undefined, 5)).toBe(false);
  });
});

describe("jsonResponse", () => {
  it("returns the status, a JSON body, the content type and the CORS headers", async () => {
    const res = jsonResponse(401, { error: GENERIC_ERROR }, { "Access-Control-Allow-Origin": "https://a.app" });

    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://a.app");
    expect(await res.json()).toEqual({ error: GENERIC_ERROR });
  });
});
