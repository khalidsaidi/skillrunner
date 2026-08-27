import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(scriptDir, "..");
const repoRoot = resolve(cliRoot, "..", "..");
const sourcePath = resolve(repoRoot, "registry", "dist", "index.json");
const sourceSkillsDir = resolve(repoRoot, "registry", "skills");
const destRegistryRoot = resolve(cliRoot, "dist", "registry");
const destPath = resolve(destRegistryRoot, "dist", "index.json");
const destSkillsDir = resolve(destRegistryRoot, "skills");

if (!existsSync(sourcePath)) {
  console.error(
    `[skillrunner] Missing registry index at ${sourcePath}. Run pnpm registry:build before building the CLI.`,
  );
  process.exit(1);
}

if (!existsSync(sourceSkillsDir)) {
  console.error(`[skillrunner] Missing skills directory at ${sourceSkillsDir}.`);
  process.exit(1);
}

rmSync(destRegistryRoot, { recursive: true, force: true });
mkdirSync(dirname(destPath), { recursive: true });
copyFileSync(sourcePath, destPath);
cpSync(sourceSkillsDir, destSkillsDir, { recursive: true });
