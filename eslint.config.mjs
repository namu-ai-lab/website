import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* Next's own presets: core-web-vitals (React, react-hooks, jsx-a11y, @next/next) and typescript (typescript-eslint).
   The rules below were already broken somewhere in the code when lint arrived, so they warn rather than fail, and
   `npm run lint` passes on day one. Each one goes back to "error" in the PR that clears its warnings.
   rules-of-hooks stays an error from the start: a hook called conditionally is a bug, not a style. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",

      // Existing code breaks these today (count at the time lint was added).
      "@next/next/no-html-link-for-pages": "warn",       // 72: internal <a href> links, mostly in content/
      "react-hooks/set-state-in-effect": "warn",         // 12
      "react-hooks/immutability": "warn",                // 5
      "react-hooks/refs": "warn",                        // 3
      "react-hooks/globals": "warn",                     // 1
      "@typescript-eslint/no-explicit-any": "warn",      // 7
      "@typescript-eslint/ban-ts-comment": "warn",       // 7
      "react/no-unescaped-entities": "warn",             // 2
      "prefer-const": "warn",                            // 2
    },
  },
  globalIgnores([".next/**", ".next-*/**", "out/**", "build/**", "next-env.d.ts"]),
]);
