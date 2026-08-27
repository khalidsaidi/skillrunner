import { existsSync, readFileSync, statSync } from "fs";
import { isAbsolute, join } from "path";
import type { SkillMeta } from "./types.js";

export interface SkillPreflightResult {
  passed: boolean;
  missingTools: string[];
  missingFiles: string[];
  missingEnv: string[];
  missingPackageJsonDeps: string[];
}

function normalizeArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
}

function isExecutableFile(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const st = statSync(path);
    if (!st.isFile()) return false;
    if (process.platform === "win32") return true;
    return (st.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function isToolAvailable(tool: string): boolean {
  const trimmed = tool.trim();
  if (!trimmed) return false;

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return isExecutableFile(trimmed);
  }

  const pathEnv = process.env.PATH || "";
  const delimiter = process.platform === "win32" ? ";" : ":";
  const dirs = pathEnv.split(delimiter).filter(Boolean);
  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .map((e) => e.toLowerCase())
          .filter(Boolean)
      : [""];

  for (const dir of dirs) {
    if (process.platform === "win32") {
      const hasExt = /\.[a-z0-9]+$/i.test(trimmed);
      const candidates = hasExt
        ? [join(dir, trimmed)]
        : extensions.map((ext) => join(dir, `${trimmed}${ext}`));
      if (candidates.some((candidate) => isExecutableFile(candidate))) {
        return true;
      }
      continue;
    }

    if (isExecutableFile(join(dir, trimmed))) return true;
  }

  return false;
}

function readPackageJsonDependencyNames(cwd: string): Set<string> | null {
  const packageJsonPath = join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      peerDependencies?: Record<string, unknown>;
      optionalDependencies?: Record<string, unknown>;
    };

    const names = new Set<string>();
    for (const section of [
      parsed.dependencies,
      parsed.devDependencies,
      parsed.peerDependencies,
      parsed.optionalDependencies,
    ]) {
      if (!section || typeof section !== "object") continue;
      for (const key of Object.keys(section)) {
        const normalized = key.trim();
        if (normalized) names.add(normalized);
      }
    }
    return names;
  } catch {
    return null;
  }
}

export function checkSkillPrerequisites(
  meta: SkillMeta,
  cwd: string,
): SkillPreflightResult {
  const prerequisites = meta.prerequisites || {};
  const tools = normalizeArray(prerequisites.tools);
  const files = normalizeArray(prerequisites.files);
  const env = normalizeArray(prerequisites.env);
  const packageJsonDeps = normalizeArray(prerequisites.packageJsonDeps);

  const missingTools = tools.filter((tool) => !isToolAvailable(tool));
  const missingFiles = files.filter((file) => {
    const path = isAbsolute(file) ? file : join(cwd, file);
    return !existsSync(path);
  });
  const missingEnv = env.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim() === "";
  });

  const packageJsonDepNames =
    packageJsonDeps.length > 0 ? readPackageJsonDependencyNames(cwd) : null;
  const missingPackageJsonDeps = packageJsonDeps.filter((name) => {
    return !packageJsonDepNames?.has(name);
  });

  return {
    passed:
      missingTools.length === 0 &&
      missingFiles.length === 0 &&
      missingEnv.length === 0 &&
      missingPackageJsonDeps.length === 0,
    missingTools,
    missingFiles,
    missingEnv,
    missingPackageJsonDeps,
  };
}
