import { existsSync, readFileSync, readdirSync } from "fs";
import matter from "gray-matter";
import { basename, extname, join } from "path";
import YAML from "yaml";
import type {
  SkillMeta,
  InputDef,
  SkillAvailability,
  SkillPrerequisites,
  SkillContractRef,
  SkillContractType,
} from "./types.js";

const REQUIRED_KEYS = ["name", "description"] as const;
const AVAILABILITY_VALUES: SkillAvailability[] = [
  "default",
  "advanced",
  "conditional",
];

const CONTRACT_CANDIDATES: SkillContractRef[] = [
  { file: "SKILL.md", type: "skill_md" },
  { file: "skill.md", type: "skill_md" },
  { file: "skill.yaml", type: "skill_yaml" },
  { file: "skill.yml", type: "skill_yaml" },
  { file: "skill.json", type: "skill_json" },
  { file: "AGENTS.md", type: "agent_markdown" },
  { file: "AGENT.md", type: "agent_markdown" },
  { file: "CLAUDE.md", type: "agent_markdown" },
  { file: "README.md", type: "readme_markdown" },
];

const ADAPTER_FALLBACK_PATTERNS = /(skill|agent|claude|instruction|contract)/i;

export const SUPPORTED_SKILL_CONTRACT_FILES = CONTRACT_CANDIDATES.map(
  (v) => v.file,
);

export interface ParseSkillContractOptions {
  contractType?: SkillContractType;
  sourcePath?: string;
  fallbackName?: string;
}

export interface LoadedSkillMeta {
  meta: SkillMeta;
  contract: SkillContractRef;
  contractPath: string;
}

export function parseSkillMd(content: string): SkillMeta {
  const { data } = matter(content);
  const meta = asRecord(data);
  if (!meta) {
    throw new Error("SKILL.md must have YAML frontmatter");
  }

  for (const key of REQUIRED_KEYS) {
    if (!isNonEmptyString(meta[key])) {
      throw new Error(`SKILL.md frontmatter must have "${key}" (string)`);
    }
  }

  return normalizeSkillMeta(meta, { sourceLabel: "SKILL.md" });
}

export function parseSkillContract(
  content: string,
  opts: ParseSkillContractOptions = {},
): SkillMeta {
  const sourcePath = opts.sourcePath || "";
  const sourceLabel = sourcePath || "skill contract";
  const contractType =
    opts.contractType || inferSkillContractType(sourcePath || "SKILL.md");

  if (contractType === "skill_json") {
    return parseSkillJson(content, sourceLabel, opts.fallbackName);
  }

  if (contractType === "skill_yaml") {
    return parseSkillYaml(content, sourceLabel, opts.fallbackName);
  }

  if (contractType === "skill_md") {
    try {
      return parseSkillMd(content);
    } catch {
      return parseMarkdownContract(content, sourceLabel, opts.fallbackName);
    }
  }

  return parseMarkdownContract(content, sourceLabel, opts.fallbackName);
}

export function inferSkillContractType(pathOrFile: string): SkillContractType {
  const normalized = pathOrFile.trim().toLowerCase();
  const file = normalized.split("/").filter(Boolean).pop() || normalized;

  if (file === "skill.md") return "skill_md";
  if (file === "skill.yaml" || file === "skill.yml") return "skill_yaml";
  if (file === "skill.json") return "skill_json";
  if (file === "agent.md" || file === "agents.md" || file === "claude.md") {
    return "agent_markdown";
  }
  if (file === "readme.md") return "readme_markdown";

  const ext = extname(file);
  if (ext === ".json") return "skill_json";
  if (ext === ".yaml" || ext === ".yml") return "skill_yaml";
  if (ext === ".md") return "agent_markdown";
  return "skill_md";
}

export function findSkillContractFile(
  skillDir: string,
): SkillContractRef | null {
  for (const candidate of CONTRACT_CANDIDATES) {
    if (existsSync(join(skillDir, candidate.file))) {
      return { ...candidate };
    }
  }

  try {
    const files = readdirSync(skillDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => {
        const ext = extname(name).toLowerCase();
        return (
          ext === ".md" || ext === ".json" || ext === ".yaml" || ext === ".yml"
        );
      });

    const fallback = files.find((name) => ADAPTER_FALLBACK_PATTERNS.test(name));
    if (fallback) {
      return {
        file: fallback,
        type: inferSkillContractType(fallback),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function loadSkillMetaFromDir(skillDir: string): LoadedSkillMeta {
  const contract = findSkillContractFile(skillDir);
  if (!contract) {
    throw new Error(
      `No supported skill contract found in ${skillDir}. Supported files: ${SUPPORTED_SKILL_CONTRACT_FILES.join(", ")}`,
    );
  }

  const contractPath = join(skillDir, contract.file);
  const content = readFileSync(contractPath, "utf-8");
  const fallbackName = inferFallbackNameFromDir(skillDir);
  const meta = parseSkillContract(content, {
    contractType: contract.type,
    sourcePath: contract.file,
    fallbackName,
  });

  return {
    meta,
    contract,
    contractPath,
  };
}

function parseSkillYaml(
  content: string,
  sourceLabel: string,
  fallbackName?: string,
): SkillMeta {
  let data: unknown;
  try {
    data = YAML.parse(content);
  } catch (e) {
    throw new Error(`Invalid YAML in ${sourceLabel}: ${(e as Error).message}`);
  }
  const meta = asRecord(data);
  if (!meta) {
    throw new Error(`Expected YAML object in ${sourceLabel}`);
  }

  return normalizeSkillMeta(meta, {
    sourceLabel,
    fallbackName,
  });
}

function parseSkillJson(
  content: string,
  sourceLabel: string,
  fallbackName?: string,
): SkillMeta {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in ${sourceLabel}: ${(e as Error).message}`);
  }
  const meta = asRecord(data);
  if (!meta) {
    throw new Error(`Expected JSON object in ${sourceLabel}`);
  }

  return normalizeSkillMeta(meta, {
    sourceLabel,
    fallbackName,
  });
}

function parseMarkdownContract(
  content: string,
  sourceLabel: string,
  fallbackName?: string,
): SkillMeta {
  const parsed = matter(content);
  const frontmatter = asRecord(parsed.data);
  const nameFromHeading = extractFirstHeading(parsed.content);
  const descFromBody = extractFirstParagraph(parsed.content);

  if (frontmatter && Object.keys(frontmatter).length > 0) {
    return normalizeSkillMeta(frontmatter, {
      sourceLabel,
      fallbackName: fallbackName || nameFromHeading,
      fallbackDescription: descFromBody,
    });
  }

  return normalizeSkillMeta(
    {},
    {
      sourceLabel,
      fallbackName: fallbackName || nameFromHeading,
      fallbackDescription:
        descFromBody || `Skill instructions in ${sourceLabel}`,
    },
  );
}

function normalizeSkillMeta(
  meta: Record<string, unknown>,
  opts: {
    sourceLabel: string;
    fallbackName?: string;
    fallbackDescription?: string;
  },
): SkillMeta {
  const name =
    pickString(meta, [["name"], ["title"], ["id"], ["slug"]]) ||
    opts.fallbackName;
  const description =
    pickString(meta, [
      ["description"],
      ["summary"],
      ["short_description"],
      ["shortDescription"],
      ["metadata", "short-description"],
      ["metadata", "short_description"],
      ["metadata", "description"],
    ]) || opts.fallbackDescription;

  if (!isNonEmptyString(name)) {
    throw new Error(`${opts.sourceLabel} must define a name`);
  }
  if (!isNonEmptyString(description)) {
    throw new Error(`${opts.sourceLabel} must define a description`);
  }

  const prerequisites = normalizePrerequisites(
    pick(meta, ["prerequisites"]) || pick(meta, ["requirements"]),
  );
  const capabilities = normalizeCapabilities(
    pick(meta, ["capabilities"]) || pick(meta, ["permissions"]),
  );
  const scripts = normalizeScripts(
    pick(meta, ["scripts"]),
    pickString(meta, [["check_script"], ["checkScript"]]),
    pickString(meta, [["run_script"], ["runScript"]]),
  );
  const docs = normalizeDocs(
    pick(meta, ["docs"]),
    pickString(meta, [["homepage"]]),
    pickString(meta, [["source"], ["repo"], ["repository"]]),
  );

  return {
    name: String(name).trim(),
    description: String(description).trim(),
    version: normalizeString(pick(meta, ["version"])),
    tags: normalizeStringArray(
      pick(meta, ["tags"]) || pick(meta, ["keywords"]),
      "comma",
    ),
    kind: normalizeKind(pick(meta, ["kind"]) || pick(meta, ["type"])),
    risk: normalizeRisk(pick(meta, ["risk"])),
    availability: normalizeAvailability(
      pick(meta, ["availability"]) || pick(meta, ["tier"]),
    ),
    prerequisites,
    capabilities,
    scripts,
    inputs: normalizeInputs(
      pick(meta, ["inputs"]) || pick(meta, ["parameters"]),
    ),
    docs,
  };
}

function normalizeKind(v: unknown): "automation" | "knowledge" | undefined {
  if (!isNonEmptyString(v)) return undefined;
  if (v === "automation" || v === "knowledge") return v;
  return undefined;
}

function normalizeRisk(v: unknown): "low" | "moderate" | "high" | undefined {
  if (!isNonEmptyString(v)) return undefined;
  if (v === "low" || v === "moderate" || v === "high") return v;
  return undefined;
}

function normalizeAvailability(v: unknown): SkillAvailability | undefined {
  if (!isNonEmptyString(v)) return undefined;
  return AVAILABILITY_VALUES.includes(v as SkillAvailability)
    ? (v as SkillAvailability)
    : undefined;
}

function normalizePrerequisites(v: unknown): SkillPrerequisites | undefined {
  const obj = asRecord(v);
  if (!obj) return undefined;

  const out: SkillPrerequisites = {};
  out.tools = normalizeStringArray(
    obj.tools || obj.tooling || obj.commands || obj.bins,
  );
  out.files = normalizeStringArray(obj.files || obj.paths || obj.filePaths);
  out.env = normalizeStringArray(obj.env || obj.environment || obj.envVars);
  out.packageJsonDeps = normalizeStringArray(
    obj.packageJsonDeps || obj.dependencies || obj.npmDeps,
  );

  if (
    !out.tools?.length &&
    !out.files?.length &&
    !out.env?.length &&
    !out.packageJsonDeps?.length
  ) {
    return undefined;
  }
  return out;
}

function normalizeCapabilities(
  v: unknown,
): SkillMeta["capabilities"] | undefined {
  const obj = asRecord(v);
  if (!obj && !Array.isArray(v)) return undefined;

  const out: NonNullable<SkillMeta["capabilities"]> = {};
  if (obj) {
    out.shell = toBoolean(obj.shell);
    out.network = toBoolean(obj.network);
    out.fs_read = toBoolean(obj.fs_read ?? obj.fsRead ?? obj.read);
    out.fs_write = toBoolean(obj.fs_write ?? obj.fsWrite ?? obj.write);
  }

  if (Array.isArray(v)) {
    for (const value of v.map(String)) {
      const item = value.trim().toLowerCase();
      if (!item) continue;
      if (item === "shell") out.shell = true;
      if (item === "network") out.network = true;
      if (item === "fs_read" || item === "fs-read" || item === "read") {
        out.fs_read = true;
      }
      if (item === "fs_write" || item === "fs-write" || item === "write") {
        out.fs_write = true;
      }
    }
  }

  if (
    out.shell === undefined &&
    out.network === undefined &&
    out.fs_read === undefined &&
    out.fs_write === undefined
  ) {
    return undefined;
  }
  return out;
}

function normalizeScripts(
  scriptsValue: unknown,
  checkFallback?: string,
  runFallback?: string,
): SkillMeta["scripts"] | undefined {
  const scripts = asRecord(scriptsValue);
  const check =
    normalizeString(scripts?.check || scripts?.validate || checkFallback) ||
    undefined;
  const run =
    normalizeString(scripts?.run || scripts?.execute || runFallback) ||
    undefined;

  if (!check && !run) return undefined;
  return { check, run };
}

function normalizeInputs(v: unknown): Record<string, InputDef> | undefined {
  const obj = asRecord(v);
  if (!obj) return undefined;
  return obj as Record<string, InputDef>;
}

function normalizeDocs(
  docsValue: unknown,
  homepageFallback?: string,
  sourceFallback?: string,
): SkillMeta["docs"] | undefined {
  const docs = asRecord(docsValue);
  const homepage = normalizeString(docs?.homepage || homepageFallback);
  const source = normalizeString(docs?.source || sourceFallback);
  if (!homepage && !source) return undefined;
  return { homepage, source };
}

function normalizeString(v: unknown): string | undefined {
  if (!isNonEmptyString(v)) return undefined;
  const value = String(v).trim();
  return value || undefined;
}

function normalizeStringArray(
  value: unknown,
  splitMode: "none" | "comma" = "none",
): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  if (!isNonEmptyString(value)) return undefined;
  const source = value.trim();
  const out =
    splitMode === "comma"
      ? source
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [source];
  return out.length ? out : undefined;
}

function extractFirstHeading(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^#{1,6}\s+/, "").trim();
      return heading || undefined;
    }
  }
  return undefined;
}

function extractFirstParagraph(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  const parts: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!trimmed) {
      if (parts.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s+/.test(trimmed)) continue;
    if (/^[-*]\s+/.test(trimmed) && parts.length === 0) continue;
    if (/^\d+\.\s+/.test(trimmed) && parts.length === 0) continue;
    parts.push(trimmed);
  }

  if (!parts.length) return undefined;
  return parts.join(" ");
}

function inferFallbackNameFromDir(skillDir: string): string {
  const value = basename(skillDir);
  const at = value.lastIndexOf("@");
  if (at > 0) {
    const suffix = value.slice(at + 1);
    if (suffix === "latest" || /^\d+\.\d+\.\d+/.test(suffix)) {
      return value.slice(0, at);
    }
  }
  return value;
}

function pickString(
  obj: Record<string, unknown>,
  paths: string[][],
): string | undefined {
  for (const path of paths) {
    const value = pick(obj, path);
    if (isNonEmptyString(value)) {
      return String(value).trim();
    }
  }
  return undefined;
}

function pick(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record || !(segment in record)) return undefined;
    current = record[segment];
  }
  return current;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function toBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
