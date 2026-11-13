import { describe, expect, it } from "vitest";
import { isReadableTextFile, looksLikeText } from "@/lib/fileText";

describe("isReadableTextFile", () => {
  it("accepts plain-text extensions in any letter case", () => {
    expect(isReadableTextFile("notes.txt")).toBe(true);
    expect(isReadableTextFile("Chapter1.MD")).toBe(true);
    expect(isReadableTextFile("data.csv")).toBe(true);
    expect(isReadableTextFile("readme.markdown")).toBe(true);
  });

  it("rejects binary document formats and names without an extension", () => {
    for (const name of ["paper.pdf", "essay.docx", "slides.pptx", "old.doc", "old.ppt", "noextension"]) {
      expect(isReadableTextFile(name), name).toBe(false);
    }
  });
});

describe("looksLikeText", () => {
  it("accepts ordinary text with tabs, newlines and carriage returns", () => {
    expect(looksLikeText("Line one\r\nLine two\n\tindented")).toBe(true);
  });

  it("accepts non-ASCII text (accents, Devanagari, CJK, emoji)", () => {
    const text = "café naïve नमस्ते दुनिया 日本語のテキスト 📚 ".repeat(50);
    expect(looksLikeText(text)).toBe(true);
  });

  it("rejects empty and blank text", () => {
    expect(looksLikeText("")).toBe(false);
    expect(looksLikeText("   \n\t ")).toBe(false);
  });

  it("tolerates a stray replacement character in a long text", () => {
    const text = "a".repeat(4000) + "�" + "b".repeat(4000);
    expect(looksLikeText(text)).toBe(true);
  });

  it("rejects text that is mostly replacement characters (undecodable bytes), with no control characters", () => {
    // What a binary file with high-bit bytes but few control bytes decodes to.
    const text = "�".repeat(300) + "hello";
    expect(looksLikeText(text)).toBe(false);
  });

  it("rejects a zip-style header, which is how Word and PowerPoint files begin", () => {
    // "PK", 0x03, 0x04 and NUL bytes; more than 1% of the sample is control characters.
    const text = "PK\u0003\u0004\u0014\u0000\u0006\u0000" + "x".repeat(200);
    expect(looksLikeText(text)).toBe(false);
  });

  it("rejects arbitrary binary bytes decoded as UTF-8", () => {
    const bytes = new Uint8Array(3000).map((_, index) => (index * 37) % 256);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    expect(looksLikeText(decoded)).toBe(false);
  });
});
