import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // CommonJS operational scripts deliberately use require and isolated module loaders.
  { files: ["scripts/**/*.cjs"], rules: {
    "@typescript-eslint/no-require-imports": "off",
    "@next/next/no-assign-module-variable": "off",
  } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/node_modules/**",
    "apps/mobile/ios/**",
    "apps/mobile/android/**",
    "apps/mobile/.expo/**",
    "**/*.bundle",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
