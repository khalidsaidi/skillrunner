import { chmodSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

/**
 * Sources `skill install` understands:
 * - a registry skill name              → `terraform-plan-review`
 * - a GitHub repo (+ optional path)    → `anthropics/skills/skills/pdf`
 * - a plain URL to a SKILL.md, or a github.com tree/blob URL
 */
export type SkillInstallSource =
  | { type: "registry"; name: string }
  | { type: "github"; owner: string; repo: string; path: string; ref?: string }
  | { type: "url"; url: string };

const GITHUB_WEB_URL =
  /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(tree|blob)\/([^/]+)(?:\/(.*))?)?\/?$/;
const RAW_GITHUB_URL =
  /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.*)$/;
const OWNER_REPO_PATH = /^([A-Za-z0-9][\w.-]*)\/([\w.-]+)(?:\/(.+))?$/;

function stripSkillMdSuffix(path: string): string {
  return path.replace(/\/?SKILL\.md$/i, "").replace(/\/+$/, "");
}

export function parseInstallSource(spec: string): SkillInstallSource {
  const trimmed = spec.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    const web = GITHUB_WEB_URL.exec(trimmed);
    if (web) {
      return {
        type: "github",
        owner: web[1],
        repo: web[2],
        ref: web[4] || undefined,
        path: stripSkillMdSuffix(web[5] || ""),
      };
    }
    const raw = RAW_GITHUB_URL.exec(trimmed);
    if (raw) {
      return {
        type: "github",
        owner: raw[1],
        repo: raw[2],
        ref: raw[3],
        path: stripSkillMdSuffix(raw[4] || ""),
      };
    }
    return { type: "url", url: trimmed };
  }

  if (trimmed.includes("/")) {
    const m = OWNER_REPO_PATH.exec(trimmed);
    if (m) {
      return {
        type: "github",
        owner: m[1],
        repo: m[2],
        path: stripSkillMdSuffix(m[3] || ""),
      };
    }
  }

  return { type: "registry", name: trimmed };
}

export interface FetchedSkillFile {
  path: string;
  content: Buffer;
}

export interface FetchedSkill {
  files: FetchedSkillFile[];
  sourceUrl: string;
}

const MAX_REMOTE_FILES = 200;
const MAX_REMOTE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DIR_DEPTH = 5;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "skillrunner-cli",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function detectDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  try {
    const data = (await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}`,
    )) as { default_branch?: string };
    if (data.default_branch) return data.default_branch;
  } catch {
    // Fall back to probing raw URLs (works without API quota).
  }
  for (const branch of ["main", "master"]) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
        { method: "HEAD", headers: { "User-Agent": "skillrunner-cli" } },
      );
      if (res.ok) return branch;
    } catch {
      // try next
    }
  }
  return "main";
}

interface GitHubContentEntry {
  type: string;
  name: string;
  path: string;
  size?: number;
  download_url?: string | null;
}

async function listGitHubDir(
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<GitHubContentEntry[]> {
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data)) {
    throw new Error(
      `Expected a directory at ${path || "/"} in ${owner}/${repo}`,
    );
  }
  return data as GitHubContentEntry[];
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "skillrunner-cli" },
  });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Download a full skill directory from GitHub via the contents API
 * (enumerates every file, so references/ and scripts/ come along).
 * Falls back to raw.githubusercontent.com for SKILL.md + conventional
 * script paths when the API is unavailable (e.g. rate-limited).
 */
export async function fetchSkillFromGitHub(source: {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<FetchedSkill> {
  const ref =
    source.ref || (await detectDefaultBranch(source.owner, source.repo));
  const base = source.path.replace(/^\/+|\/+$/g, "");
  const sourceUrl = `https://github.com/${source.owner}/${source.repo}${
    base ? `/tree/${ref}/${base}` : ""
  }`;

  try {
    const topEntries = await listGitHubDir(
      source.owner,
      source.repo,
      base,
      ref,
    );
    const hasSkillMd = topEntries.some(
      (e) => e.type === "file" && e.name.toLowerCase() === "skill.md",
    );
    if (!hasSkillMd) {
      const subdirsWithSkills = await probeForSkillSubdirs(
        source.owner,
        source.repo,
        base,
        ref,
      );
      const hint = subdirsWithSkills.length
        ? ` Did you mean one of: ${subdirsWithSkills
            .slice(0, 10)
            .map((s) => `${source.owner}/${source.repo}/${s}`)
            .join(", ")}?`
        : "";
      throw new Error(`No SKILL.md at ${sourceUrl}.${hint}`);
    }
    const files = await fetchGitHubDirRecursive(
      source.owner,
      source.repo,
      base,
      ref,
    );
    return { files, sourceUrl };
  } catch (apiError) {
    // Raw fallback: grab SKILL.md and conventional script locations.
    const rawBase = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${ref}${base ? `/${base}` : ""}`;
    let skillMd: Buffer;
    try {
      skillMd = await fetchBinary(`${rawBase}/SKILL.md`);
    } catch {
      throw apiError instanceof Error ? apiError : new Error(String(apiError));
    }
    const files: FetchedSkillFile[] = [{ path: "SKILL.md", content: skillMd }];
    for (const candidate of ["scripts/check.sh", "scripts/run.sh"]) {
      try {
        files.push({
          path: candidate,
          content: await fetchBinary(`${rawBase}/${candidate}`),
        });
      } catch {
        // optional
      }
    }
    return { files, sourceUrl };
  }
}

async function probeForSkillSubdirs(
  owner: string,
  repo: string,
  base: string,
  ref: string,
): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await listGitHubDir(owner, repo, base, ref);
    for (const entry of entries) {
      if (entry.type !== "dir") continue;
      try {
        const children = await listGitHubDir(owner, repo, entry.path, ref);
        if (children.some((c) => c.name.toLowerCase() === "skill.md")) {
          out.push(entry.path);
        }
      } catch {
        // skip
      }
      if (out.length >= 10) break;
    }
  } catch {
    // no hints available
  }
  return out;
}

async function fetchGitHubDirRecursive(
  owner: string,
  repo: string,
  base: string,
  ref: string,
): Promise<FetchedSkillFile[]> {
  const files: FetchedSkillFile[] = [];
  const queue: { path: string; depth: number }[] = [{ path: base, depth: 0 }];
  while (queue.length > 0) {
    const { path, depth } = queue.shift() as { path: string; depth: number };
    const entries = await listGitHubDir(owner, repo, path, ref);
    for (const entry of entries) {
      if (files.length >= MAX_REMOTE_FILES) return files;
      const rel = base
        ? entry.path.startsWith(`${base}/`)
          ? entry.path.slice(base.length + 1)
          : entry.path
        : entry.path;
      if (entry.type === "dir") {
        if (depth + 1 <= MAX_DIR_DEPTH) {
          queue.push({ path: entry.path, depth: depth + 1 });
        }
        continue;
      }
      if (entry.type !== "file") continue;
      if ((entry.size || 0) > MAX_REMOTE_FILE_BYTES) continue;
      if (!entry.download_url) continue;
      files.push({
        path: rel,
        content: await fetchBinary(entry.download_url),
      });
    }
  }
  return files;
}

/**
 * Fetch a skill from a plain URL pointing at a SKILL.md (or a directory
 * that contains one). Also downloads conventional script paths next to it.
 */
export async function fetchSkillFromUrl(url: string): Promise<FetchedSkill> {
  const normalized = url.replace(/\/+$/, "");
  const isSkillMd = /skill\.md$/i.test(normalized);
  const skillMdUrl = isSkillMd ? normalized : `${normalized}/SKILL.md`;
  const baseUrl = isSkillMd ? normalized.replace(/\/[^/]+$/, "") : normalized;

  const skillMd = await fetchBinary(skillMdUrl);
  const files: FetchedSkillFile[] = [{ path: "SKILL.md", content: skillMd }];
  for (const candidate of ["scripts/check.sh", "scripts/run.sh"]) {
    try {
      files.push({
        path: candidate,
        content: await fetchBinary(`${baseUrl}/${candidate}`),
      });
    } catch {
      // optional
    }
  }
  return { files, sourceUrl: skillMdUrl };
}

/** Write fetched files into a destination directory. */
export function writeFetchedSkill(
  destDir: string,
  fetched: FetchedSkill,
): void {
  for (const file of fetched.files) {
    const safe = file.path.replace(/\\/g, "/");
    if (safe.startsWith("/") || safe.split("/").includes("..")) continue;
    const target = join(destDir, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    if (safe.endsWith(".sh")) chmodSync(target, 0o755);
  }
}
