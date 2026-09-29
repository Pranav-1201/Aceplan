import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    const disabled = false;
    expect(cn("a", disabled && "b", "c")).toBe("a c");
  });

  it("lets a later Tailwind utility override an earlier conflicting one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
