// NOTE: Reconstructed during the 0.1.3 source recovery. The published
// dist/cli.js is a non-minified esbuild ESM bundle that inlines the workspace
// engine package (its dist output, with sourcemaps chained back to the engine
// TypeScript) and keeps the npm dependencies external — which is exactly what
// this configuration produces.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  // Resolve the engine workspace package through its built dist (not the
  // tsconfig.json paths mapping used for typechecking) so the bundle inlines
  // ../engine/dist/*.js exactly like the published 0.1.3 artifact did.
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  platform: "node",
  target: "node20",
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  minify: false,
  noExternal: ["@khalidsaidi/skillrunner-engine"],
});
