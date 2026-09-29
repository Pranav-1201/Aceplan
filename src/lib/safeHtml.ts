import DOMPurify from "dompurify";
import { marked } from "marked";

// Turns Markdown into HTML that is safe to put in the page. The Markdown here comes from an AI
// model (and, indirectly, from whatever material the user pasted in), so its HTML is untrusted:
// DOMPurify removes scripts, inline event handlers and javascript: links but keeps ordinary
// formatting, tables and images. Every place that renders AI Markdown should call this instead
// of using marked directly.
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown) as string;
  return DOMPurify.sanitize(html);
}
