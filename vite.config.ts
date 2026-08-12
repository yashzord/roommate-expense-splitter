import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  // Globals on as a safety net so tests using afterEach/vi without importing
  // them still run; the test prompt asks for explicit imports regardless.
  test: { globals: true },
});
