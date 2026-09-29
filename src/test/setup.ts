// Adds DOM matchers such as toBeInTheDocument() to Vitest's expect. Loaded by vitest.config.ts.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only removes rendered components between tests by itself when Vitest globals
// are on. They are off here, so do it explicitly; otherwise one test's page leaks into the next.
afterEach(() => {
  cleanup();
});
