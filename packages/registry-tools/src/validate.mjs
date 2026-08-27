// NOTE: Reconstructed during the 0.1.3 source recovery.
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const registryRoot = join(repoRoot, "registry");
const skillsDir = join(registryRoot, "skills");
const packsDir = join(registryRoot, "packs");

const errors = [];

const slugs = existsSync(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

if (!slugs.length) {
  errors.push(`No skills found in ${skillsDir}`);
}

for (const slug of slugs) {
  const skillMdPath = join(skillsDir, slug, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    errors.push(`${slug}: missing SKILL.md`);
    continue;
  }
  let meta;
  try {
    meta = matter(readFileSync(skillMdPath, "utf-8")).data;
  } catch (e) {
    errors.push(`${slug}: invalid SKILL.md frontmatter (${e.message})`);
    continue;
  }
  if (typeof meta.name !== "string" || !meta.name.trim()) {
    errors.push(`${slug}: SKILL.md frontmatter must have "name"`);
  }
  if (typeof meta.description !== "string" || !meta.description.trim()) {
    errors.push(`${slug}: SKILL.md frontmatter must have "description"`);
  }
  if (meta.scripts && typeof meta.scripts === "object") {
    for (const key of ["check", "run"]) {
      const rel = meta.scripts[key];
      if (typeof rel !== "string" || !rel.trim()) continue;
      const scriptPath = join(skillsDir, slug, rel);
      if (!existsSync(scriptPath) || !statSync(scriptPath).isFile()) {
        errors.push(`${slug}: scripts.${key} points to missing file ${rel}`);
      }
    }
  }
}

if (existsSync(packsDir)) {
  const slugSet = new Set(slugs);
  for (const file of readdirSync(packsDir)
    .filter((f) => /\.(ya?ml|json)$/i.test(f))
    .sort()) {
    let data;
    try {
      const content = readFileSync(join(packsDir, file), "utf-8");
      data = /\.json$/i.test(file) ? JSON.parse(content) : YAML.parse(content);
    } catch (e) {
      errors.push(`packs/${file}: parse error (${e.message})`);
      continue;
    }
    if (!data || typeof data !== "object" || !Array.isArray(data.skills)) {
      errors.push(`packs/${file}: must define a "skills" array`);
      continue;
    }
    for (const ref of data.skills) {
      if (!slugSet.has(String(ref))) {
        errors.push(`packs/${file}: references unknown skill "${ref}"`);
      }
    }
  }
}

if (errors.length) {
  console.error(`registry:validate FAILED (${errors.length} problem(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`registry:validate OK (${slugs.length} skills)`);
