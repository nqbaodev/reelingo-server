import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.ts", "packages/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  prettier,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
);
