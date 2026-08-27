// NOTE: Reconstructed during the 0.1.3 source recovery. Verified to
// reproduce the registry index shipped inside the published npm package
// (dist/registry/dist/index.json) byte-for-byte apart from `generated_at`.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const registryRoot = join(repoRoot, "registry");
const skillsDir = join(registryRoot, "skills");
const packsDir = join(registryRoot, "packs");
const outDir = join(registryRoot, "dist");

const REPO = "khalidsaidi/skillrunner";
const REF = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/registry/skills`;

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    const out = value
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const out = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

function toBoolean(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function normalizeCapabilities(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = {};
  const shell = toBoolean(v.shell);
  const network = toBoolean(v.network);
  const fsRead = toBoolean(v.fs_read ?? v.fsRead ?? v.read);
  const fsWrite = toBoolean(v.fs_write ?? v.fsWrite ?? v.write);
  if (shell !== undefined) out.shell = shell;
  if (network !== undefined) out.network = network;
  if (fsRead !== undefined) out.fs_read = fsRead;
  if (fsWrite !== undefined) out.fs_write = fsWrite;
  return Object.keys(out).length ? out : undefined;
}

function normalizeScripts(v) {
  if (!v || typeof v !== "object") return undefined;
  const out = {};
  if (typeof v.check === "string" && v.check.trim()) out.check = v.check.trim();
  if (typeof v.run === "string" && v.run.trim()) out.run = v.run.trim();
  return Object.keys(out).length ? out : undefined;
}

function buildSkillEntry(slug) {
  const skillMdPath = join(skillsDir, slug, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    throw new Error(`Missing SKILL.md for skill "${slug}"`);
  }
  const { data: meta } = matter(readFileSync(skillMdPath, "utf-8"));
  if (typeof meta.name !== "string" || !meta.name.trim()) {
    throw new Error(`Skill "${slug}" SKILL.md frontmatter must have "name"`);
  }
  if (typeof meta.description !== "string" || !meta.description.trim()) {
    throw new Error(
      `Skill "${slug}" SKILL.md frontmatter must have "description"`,
    );
  }

  const entry = {
    name: meta.name.trim(),
    description: meta.description.trim(),
  };
  if (typeof meta.version === "string" && meta.version.trim()) {
    entry.version = meta.version.trim();
  }
  const tags = normalizeStringArray(meta.tags ?? meta.keywords);
  if (tags) entry.tags = tags;
  if (meta.kind === "automation" || meta.kind === "knowledge") {
    entry.kind = meta.kind;
  }
  if (meta.risk === "low" || meta.risk === "moderate" || meta.risk === "high") {
    entry.risk = meta.risk;
  }
  if (
    meta.availability === "default" ||
    meta.availability === "advanced" ||
    meta.availability === "conditional"
  ) {
    entry.availability = meta.availability;
  }

  const capabilities = normalizeCapabilities(
    meta.capabilities ?? meta.permissions,
  );
  if (capabilities) entry.capabilities = capabilities;
  const scripts = normalizeScripts(meta.scripts);
  if (scripts) entry.scripts = scripts;

  entry.contract = { type: "skill_md", file: "SKILL.md" };
  const dir = `registry/skills/${slug}`;
  const skillMd = `${dir}/SKILL.md`;
  const rawSkillMd = `${RAW_BASE}/${slug}/SKILL.md`;
  entry.paths = {
    dir,
    skill_md: skillMd,
    raw_skill_md: rawSkillMd,
    contract: skillMd,
    raw_contract: rawSkillMd,
  };

  return entry;
}

function buildPacks() {
  if (!existsSync(packsDir)) return [];
  const packFiles = readdirSync(packsDir)
    .filter((f) => /\.(ya?ml|json)$/i.test(f))
    .sort();
  const packs = [];
  for (const file of packFiles) {
    const content = readFileSync(join(packsDir, file), "utf-8");
    const data = /\.json$/i.test(file)
      ? JSON.parse(content)
      : YAML.parse(content);
    if (!data || typeof data !== "object") continue;
    const pack = { name: String(data.name || file.replace(/\.[^.]+$/, "")) };
    if (typeof data.description === "string") {
      pack.description = data.description;
    }
    pack.skills = normalizeStringArray(data.skills) || [];
    packs.push(pack);
  }
  return packs;
}

const slugs = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const index = {
  registry_version: 1,
  generated_at: new Date().toISOString(),
  source: {
    repo: REPO,
    ref: REF,
    base_url: RAW_BASE,
  },
  skills: slugs.map(buildSkillEntry),
  packs: buildPacks(),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
console.log(
  `registry:build -> ${join(outDir, "index.json")} (${index.skills.length} skills, ${index.packs.length} packs)`,
);
