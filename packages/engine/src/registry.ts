import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { findRegistryRoot } from "./paths.js";
import type { RegistryIndex, RegistrySkill } from "./types.js";

const DEFAULT_REGISTRY_URLS = [
  "https://khalidsaidi.github.io/skillrunner/index.json",
  "https://khalidsaidi.github.io/skillrunner/registry/dist/index.json",
  "https://raw.githubusercontent.com/khalidsaidi/skillrunner/main/registry/dist/index.json",
  "https://raw.githubusercontent.com/khalidsaidi/skillrunner/master/registry/dist/index.json",
];

const CACHE_DIR = join(process.env.HOME || "", ".skillrunner");
export const REGISTRY_CACHE_DIR = join(CACHE_DIR, "registry-cache");
export const SKILLS_DIR = join(CACHE_DIR, "skills");
export const RUNS_DIR = join(CACHE_DIR, "runs");

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

export function getRunsDir(): string {
  return RUNS_DIR;
}

function getRegistryCandidates(baseUrl?: string): string[] {
  const urls = [
    baseUrl,
    process.env.SKILLRUNNER_REGISTRY_URL,
    ...DEFAULT_REGISTRY_URLS,
  ].filter((v): v is string => Boolean(v));

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    deduped.push(u);
  }
  return deduped;
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function stripVersionSpecifier(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf("@");
  if (at > 0) return trimmed.slice(0, at);
  return trimmed;
}

function pathBasename(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function extractSkillSlugFromPaths(skill: RegistrySkill): string {
  const contractPath = skill.paths?.contract || "";
  if (contractPath) {
    const normalized = contractPath.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 2];
  }

  const fromDir = pathBasename(skill.paths?.dir || "");
  if (fromDir) return fromDir;

  const skillMd = skill.paths?.skill_md || "";
  const normalized = skillMd.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (
    parts.length >= 2 &&
    parts[parts.length - 1].toLowerCase() === "skill.md"
  ) {
    return parts[parts.length - 2];
  }

  return "";
}

function parseRegistryPayload(payload: unknown): RegistryIndex | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as {
    skills?: unknown[];
    packs?: unknown[];
    index?: unknown;
  };
  if (Array.isArray(maybe.skills)) {
    return {
      ...(payload as RegistryIndex),
      skills: maybe.skills as RegistrySkill[],
      packs: Array.isArray(maybe.packs)
        ? (maybe.packs as RegistryIndex["packs"])
        : [],
    };
  }

  const nestedIndex = maybe.index as
    | { skills?: unknown[]; packs?: unknown[] }
    | undefined;
  if (nestedIndex && Array.isArray(nestedIndex.skills)) {
    return {
      ...(nestedIndex as RegistryIndex),
      skills: nestedIndex.skills as RegistrySkill[],
      packs: Array.isArray(nestedIndex.packs)
        ? (nestedIndex.packs as RegistryIndex["packs"])
        : [],
    };
  }

  return null;
}

export function getRegistrySkillSlug(skill: RegistrySkill): string {
  return extractSkillSlugFromPaths(skill) || skill.name;
}

export async function fetchRemoteRegistry(
  baseUrl?: string,
): Promise<RegistryIndex> {
  const candidates = getRegistryCandidates(baseUrl);
  if (candidates.length === 0) {
    throw new Error("No registry URL configured");
  }

  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        errors.push(`${url} -> ${res.status} ${res.statusText}`);
        continue;
      }
      const payload = await res.json();
      const parsed = parseRegistryPayload(payload);
      if (!parsed) {
        errors.push(`${url} -> invalid registry payload`);
        continue;
      }
      return parsed;
    } catch (e) {
      errors.push(`${url} -> ${(e as Error).message}`);
    }
  }

  throw new Error(
    `Failed to fetch registry from all sources: ${errors.join("; ")}`,
  );
}

export function loadLocalRegistry(repoRoot: string): RegistryIndex | null {
  const path = join(repoRoot, "registry", "dist", "index.json");
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as RegistryIndex;
}

export function resolveRegistryRoot(startCwd = process.cwd()): string {
  const cwdRoot = findRegistryRoot(startCwd);
  if (cwdRoot) return cwdRoot;

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const moduleRoot = findRegistryRoot(moduleDir);
  if (moduleRoot) return moduleRoot;
  return "";
}

export function loadBundledRegistry(): RegistryIndex | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(moduleDir, "registry", "dist", "index.json"),
    join(moduleDir, "..", "registry", "dist", "index.json"),
  ];

  const moduleRoot = findRegistryRoot(moduleDir);
  if (moduleRoot) {
    candidates.push(join(moduleRoot, "registry", "dist", "index.json"));
  }

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const content = readFileSync(path, "utf-8");
      return JSON.parse(content) as RegistryIndex;
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function resolveRegistryIndex(
  startCwd = process.cwd(),
): Promise<RegistryIndex> {
  const root = resolveRegistryRoot(startCwd);
  const local = root ? loadLocalRegistry(root) : null;
  if (local) return local;

  try {
    return await fetchRemoteRegistry();
  } catch (remoteError) {
    const bundled = loadBundledRegistry();
    if (bundled) return bundled;
    throw remoteError;
  }
}

export function searchRegistry(
  index: RegistryIndex,
  query: string,
): RegistrySkill[] {
  const q = normalizeLookup(query);
  return index.skills.filter(
    (s) =>
      normalizeLookup(s.name).includes(q) ||
      normalizeLookup(getRegistrySkillSlug(s)).includes(q) ||
      normalizeLookup(s.description).includes(q) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(q))),
  );
}

export function getSkillFromIndex(
  index: RegistryIndex,
  name: string,
): RegistrySkill | undefined {
  const lookup = normalizeLookup(stripVersionSpecifier(name));
  if (!lookup) return undefined;

  return index.skills.find((s) => {
    if (normalizeLookup(s.name) === lookup) return true;
    return normalizeLookup(getRegistrySkillSlug(s)) === lookup;
  });
}
