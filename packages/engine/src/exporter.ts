import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import matter from "gray-matter";
import YAML from "yaml";

/**
 * Export targets: agent products that consume open-standard SKILL.md skill
 * directories (agentskills.io). SkillRunner exports spec-pure skills into
 * the directories each product reads.
 */
export interface ExportTargetDef {
  id: string;
  aliases: string[];
  label: string;
  /** Directory under $HOME for globally-available skills. */
  globalDir: string[];
  /** Directory under the project root for project-scoped skills. */
  projectDir: string[];
}

export const EXPORT_TARGETS: ExportTargetDef[] = [
  {
    id: "claude",
    aliases: ["claude-code"],
    label: "Claude Code",
    globalDir: [".claude", "skills"],
    projectDir: [".claude", "skills"],
  },
  {
    id: "codex",
    aliases: ["agents", "codex-cli"],
    label: "Codex CLI (~/.agents)",
    globalDir: [".agents", "skills"],
    projectDir: [".agents", "skills"],
  },
  {
    id: "cursor",
    aliases: [],
    label: "Cursor",
    globalDir: [".cursor", "skills"],
    projectDir: [".cursor", "skills"],
  },
  {
    id: "opencode",
    aliases: [],
    label: "opencode",
    globalDir: [".config", "opencode", "skills"],
    projectDir: [".opencode", "skills"],
  },
];

export function resolveExportTarget(id: string): ExportTargetDef | null {
  const lookup = id.trim().toLowerCase();
  return (
    EXPORT_TARGETS.find((t) => t.id === lookup || t.aliases.includes(lookup)) ||
    null
  );
}

export function resolveExportDir(
  target: ExportTargetDef,
  scope: "global" | "project",
  opts: { home?: string; cwd?: string } = {},
): string {
  if (scope === "project") {
    const cwd = opts.cwd || process.cwd();
    return join(cwd, ...target.projectDir);
  }
  const home = opts.home || homedir();
  return join(home, ...target.globalDir);
}

/**
 * Sanitize a skill name to the agentskills.io spec:
 * 1-64 chars, lowercase alphanumerics + hyphens, no leading/trailing/double hyphens.
 */
export function sanitizeSkillName(name: string): string {
  const out = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return out || "skill";
}

/** Strip SkillRunner import-rename suffixes like "(Imported from anthropic upstream skills)". */
export function stripImportSuffix(description: string): string {
  return description.replace(/\s*\(Imported from[^)]*\)\s*$/i, "").trim();
}

const SPEC_FIELDS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);

function stringifyMetaValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => String(v).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(record)) {
      if (v === null || v === undefined || v === false || v === "") continue;
      if (v === true) parts.push(k);
      else parts.push(`${k}=${String(v)}`);
    }
    return parts.length ? parts.join(", ") : undefined;
  }
  return undefined;
}

export interface SpecSkillMd {
  name: string;
  content: string;
}

/**
 * Turn a SkillRunner SKILL.md into a spec-pure agentskills.io SKILL.md:
 * - name sanitized to the spec charset
 * - "(Imported from ...)" suffixes stripped from the description
 * - custom fields (kind/risk/capabilities/scripts/...) moved under `metadata`
 *   as string values, spec fields (license/compatibility/allowed-tools) kept.
 */
export function buildSpecSkillMd(content: string): SpecSkillMd {
  const parsed = matter(content);
  const data = (parsed.data || {}) as Record<string, unknown>;

  const rawName = typeof data.name === "string" ? data.name : "";
  const name = sanitizeSkillName(rawName || "skill");
  const rawDescription =
    typeof data.description === "string" ? data.description : "";
  const description = stripImportSuffix(rawDescription) || rawDescription;

  const frontmatter: Record<string, unknown> = {
    name,
    description,
  };
  if (typeof data.license === "string" && data.license.trim()) {
    frontmatter.license = data.license.trim();
  }
  if (typeof data.compatibility === "string" && data.compatibility.trim()) {
    frontmatter.compatibility = data.compatibility.trim();
  }
  if (
    typeof data["allowed-tools"] === "string" &&
    (data["allowed-tools"] as string).trim()
  ) {
    frontmatter["allowed-tools"] = (data["allowed-tools"] as string).trim();
  }

  const metadata: Record<string, string> = {};
  const existingMeta = data.metadata;
  if (existingMeta && typeof existingMeta === "object") {
    for (const [k, v] of Object.entries(
      existingMeta as Record<string, unknown>,
    )) {
      const s = stringifyMetaValue(v);
      if (s !== undefined) metadata[k] = s;
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (SPEC_FIELDS.has(key)) continue;
    const s = stringifyMetaValue(value);
    if (s !== undefined && metadata[key] === undefined) {
      metadata[key] = s;
    }
  }

  if (Object.keys(metadata).length > 0) {
    frontmatter.metadata = metadata;
  }

  const yaml = YAML.stringify(frontmatter, { lineWidth: 0 }).trimEnd();
  const body = parsed.content.replace(/^\s*\n/, "");
  return {
    name,
    content: `---\n${yaml}\n---\n\n${body.trimEnd()}\n`,
  };
}

export interface ExportSkillResult {
  name: string;
  destDir: string;
  usedUpstream: boolean;
}

/**
 * Export one skill directory to `destRoot/<spec-name>/`.
 *
 * When the skill carries a pristine `upstream/` copy (imported skills),
 * that copy is exported verbatim — it is already spec-pure. Otherwise the
 * SKILL.md frontmatter is rewritten to the spec and all other files are
 * copied alongside it.
 */
export function exportSkill(
  sourceDir: string,
  destRoot: string,
  opts: { force?: boolean } = {},
): ExportSkillResult {
  const upstreamDir = join(sourceDir, "upstream");
  const upstreamSkillMd = join(upstreamDir, "SKILL.md");
  const usedUpstream = existsSync(upstreamSkillMd);
  const contentDir = usedUpstream ? upstreamDir : sourceDir;
  const skillMdPath = join(contentDir, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    throw new Error(`No SKILL.md found in ${contentDir}`);
  }

  const raw = readFileSync(skillMdPath, "utf-8");
  const spec = usedUpstream ? specNameOnly(raw) : buildSpecSkillMd(raw);

  const destDir = join(destRoot, spec.name);
  if (existsSync(destDir)) {
    if (!opts.force) {
      throw new Error(
        `Destination already exists: ${destDir} (use --force to overwrite)`,
      );
    }
    rmSync(destDir, { recursive: true, force: true });
  }
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(contentDir, { withFileTypes: true })) {
    if (entry.name === "SKILL.md") continue;
    if (!usedUpstream && entry.name === "upstream") continue;
    cpSync(join(contentDir, entry.name), join(destDir, entry.name), {
      recursive: true,
    });
  }
  writeFileSync(join(destDir, "SKILL.md"), spec.content);

  return { name: spec.name, destDir, usedUpstream };
}

/** For pristine upstream copies: keep content verbatim, just read the name. */
function specNameOnly(content: string): SpecSkillMd {
  const parsed = matter(content);
  const data = (parsed.data || {}) as Record<string, unknown>;
  const rawName = typeof data.name === "string" ? data.name : "skill";
  return { name: sanitizeSkillName(rawName), content };
}
