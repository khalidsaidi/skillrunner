// NOTE: Reconstructed during the 0.1.3 source recovery. The published
// package bundles the registry snapshot at dist/registry/{dist,skills}, which
// is what loadBundledRegistry() in the engine resolves at runtime.
import { cpSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(here, "..");
const repoRoot = resolve(cliRoot, "..", "..");

const registryRoot = join(repoRoot, "registry");
const skillsDir = join(registryRoot, "skills");
const indexFile = join(registryRoot, "dist", "index.json");
const outDir = join(cliRoot, "dist", "registry");

if (!existsSync(skillsDir)) {
  console.error(`copy-bundled-registry: missing ${skillsDir}`);
  process.exit(1);
}
if (!existsSync(indexFile)) {
  console.error(
    `copy-bundled-registry: missing ${indexFile} — run "pnpm registry:build" first`,
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(registryRoot, "dist"), join(outDir, "dist"), { recursive: true });
cpSync(skillsDir, join(outDir, "skills"), { recursive: true });
console.log(`copy-bundled-registry: copied registry snapshot to ${outDir}`);
