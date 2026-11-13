import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Unit tests run in jsdom. The "@" alias mirrors vite.config.ts so tests import like the app.
// passWithNoTests stays false on purpose: an empty suite must fail, not pass silently.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "supabase/**/*.test.ts"],
    passWithNoTests: false,
  },
});
