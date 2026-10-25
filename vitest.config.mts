import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/* Unit tests for pure logic. Each one is a *.test.ts file under src/, beside the module it tests, and runs in Node
   with no database, network or browser. `npm test` runs them once; `npx vitest` watches. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws unless it is bundled for React Server Components. Tests import server modules directly,
      // so they get the package's own empty build, as the server bundle does.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
