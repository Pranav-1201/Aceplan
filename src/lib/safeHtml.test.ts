import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/safeHtml";

describe("renderMarkdown", () => {
  it("keeps ordinary formatting, tables and images", () => {
    const html = renderMarkdown(
      [
        "# Title",
        "",
        "**bold** text",
        "",
        "| a | b |",
        "|---|---|",
        "| 1 | 2 |",
        "",
        "![diagram](https://upload.wikimedia.org/wikipedia/commons/x.png)",
      ].join("\n"),
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<table");
    expect(html).toContain("<img");
    expect(html).toContain("https://upload.wikimedia.org/wikipedia/commons/x.png");
  });

  it("removes script tags", () => {
    const html = renderMarkdown("Hello <script>alert(1)</script> world");

    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("Hello");
  });

  it("removes inline event handlers", () => {
    const html = renderMarkdown("<img src=x onerror=alert(1)>");

    expect(html).not.toContain("onerror");
  });

  it("removes javascript: links", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");

    expect(html).not.toContain("javascript:");
    expect(html).toContain("click me");
  });
});
