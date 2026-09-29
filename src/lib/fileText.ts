// Helpers for reading uploaded files as text in the browser. Used by the AI notes uploader
// (src/components/ai-notes/GenerateNotes.tsx). Only plain-text formats can be read here: PDF, Word
// and PowerPoint files are binary, and reading them with File.text() yields garbage that would
// otherwise be sent to the AI as if it were the student's material.

const READABLE_EXTENSIONS = [".txt", ".md", ".markdown", ".csv"];

// Share of "bad" characters above which a file is treated as binary. Real text has almost none;
// a compressed binary file has a large share. Chosen from how binary decodes (see the tests),
// not tuned on real uploads.
const MAX_BAD_SHARE = 0.01;

export function isReadableTextFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return READABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

// True when the decoded text looks like real text. Binary data decoded as UTF-8 turns into
// replacement characters (U+FFFD) and control characters other than tab, newline and carriage
// return; only the first few thousand characters are checked.
export function looksLikeText(text: string): boolean {
  if (text.trim() === "") return false;

  const sample = text.slice(0, 5000);
  let bad = 0;
  for (const character of sample) {
    const code = character.codePointAt(0) ?? 0;
    const isControl = code < 32 && code !== 9 && code !== 10 && code !== 13;
    if (isControl || code === 0xfffd) bad++;
  }
  return bad / sample.length <= MAX_BAD_SHARE;
}
