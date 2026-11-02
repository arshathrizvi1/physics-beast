import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".wrangler/**",
    ".oss-scanner/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "android/**",
    "android-app/**",
    "brilliant_academy_flutter/**",
    "rtmp-server/**",
    "whatsapp-otp-bot/**",
    "local-mocks/**",
    "legacy-scripts/**",
    "scripts/**",
    "worker.js",
  ]),
]);

export default eslintConfig;
