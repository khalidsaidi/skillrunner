import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  bundle: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: ["@khalidsaidi/skillrunner-engine"],
  external: ["chalk", "commander", "gray-matter", "ora", "prompts", "yaml"],
});
