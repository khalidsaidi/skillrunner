// NOTE: Reconstructed during the 0.1.3 source recovery (the original lint
// config was not recoverable from the published package).
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "registry/**",
      "**/*.mjs",
      "eslint.config.js",
    ],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["packages/**/*.ts"],
  })),
  {
    files: ["packages/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
