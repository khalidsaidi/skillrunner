#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { parseSkillContract } from "@khalidsaidi/skillrunner-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const REGISTRY_SKILLS_DIR = join(REPO_ROOT, "registry", "skills");

type UpstreamSource = {
  provider: "openai" | "anthropic";
  repoUrl: string;
  branch: string;
  skillsPath: string;
  availability: "advanced" | "conditional";
};

const SOURCES: UpstreamSource[] = [
  {
    provider: "openai",
    repoUrl: "https://github.com/openai/skills.git",
    branch: "main",
    skillsPath: "skills/.curated",
    availability: "advanced",
  },
  {
    provider: "openai",
    repoUrl: "https://github.com/openai/skills.git",
    branch: "main",
    skillsPath: "skills/.system",
    availability: "advanced",
  },
  {
    provider: "anthropic",
    repoUrl: "https://github.com/anthropics/skills.git",
    branch: "main",
    skillsPath: "skills",
    availability: "advanced",
  },
];

function sanitizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMarkdownFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  return normalized.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function dedupe(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function buildSkillMd(params: {
  name: string;
  description: string;
  version?: string;
  tags: string[];
  kind: "automation" | "knowledge";
  risk: "low" | "moderate" | "high";
  availability: "advanced" | "conditional";
  sourceUrl: string;
  originalName: string;
  originalBody: string;
}): string {
  const version = params.version || "1.0.0";
  const tags = dedupe(params.tags);
  const tagsYaml = tags.length ? `[${tags.map(quoteYaml).join(", ")}]` : "[]";

  return `---
name: ${params.name}
description: ${quoteYaml(params.description)}
version: ${quoteYaml(version)}
tags: ${tagsYaml}
kind: ${params.kind}
risk: ${params.risk}
availability: ${params.availability}
docs:
  source: ${quoteYaml(params.sourceUrl)}
---

# ${params.name}

Imported upstream skill.

- Provider source: ${params.sourceUrl}
- Original skill name: ${params.originalName}

## Upstream Content

${params.originalBody}
`;
}

function listSkillDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function cloneSourceRepo(source: UpstreamSource): string {
  const tempBase = mkdtempSync(
    join(tmpdir(), `skillrunner-${source.provider}-`),
  );
  const cloneDir = join(tempBase, "repo");

  execFileSync(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--branch",
      source.branch,
      source.repoUrl,
      cloneDir,
    ],
    { stdio: "pipe" },
  );

  return cloneDir;
}

function removeExistingImportedSkills(): void {
  if (!existsSync(REGISTRY_SKILLS_DIR)) return;
  for (const entry of readdirSync(REGISTRY_SKILLS_DIR, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    if (
      entry.name.startsWith("openai-") ||
      entry.name.startsWith("anthropic-")
    ) {
      rmSync(join(REGISTRY_SKILLS_DIR, entry.name), {
        recursive: true,
        force: true,
      });
    }
  }
}

function importSource(source: UpstreamSource): number {
  const cloneDir = cloneSourceRepo(source);
  const sourceSkillsRoot = join(cloneDir, source.skillsPath);
  const skillDirs = listSkillDirs(sourceSkillsRoot);

  let imported = 0;
  for (const skillDirName of skillDirs) {
    const skillPath = join(sourceSkillsRoot, skillDirName);
    const upstreamSkillMd = join(skillPath, "SKILL.md");
    if (!existsSync(upstreamSkillMd)) continue;

    const upstreamRaw = readFileSync(upstreamSkillMd, "utf-8");
    let upstreamMeta;
    try {
      upstreamMeta = parseSkillContract(upstreamRaw, {
        sourcePath: "SKILL.md",
        fallbackName: skillDirName,
      });
    } catch {
      continue;
    }

    const slug = sanitizeSlug(`${source.provider}-${skillDirName}`);
    if (!slug) continue;
    const destDir = join(REGISTRY_SKILLS_DIR, slug);
    ensureDir(destDir);

    const relativePath = `${source.skillsPath}/${skillDirName}`;
    const sourceUrl = `${source.repoUrl.replace(/\.git$/, "")}/tree/${source.branch}/${relativePath}`;
    const upstreamBody = stripMarkdownFrontmatter(upstreamRaw);

    const mergedDescription = `${upstreamMeta.description} (Imported from ${source.provider} upstream skills)`;
    const tags = dedupe([
      source.provider,
      "upstream",
      "imported",
      ...(upstreamMeta.tags || []),
    ]);
    const kind = upstreamMeta.kind || "knowledge";
    const risk = upstreamMeta.risk || "low";

    const generatedSkillMd = buildSkillMd({
      name: slug,
      description: mergedDescription,
      version: upstreamMeta.version,
      tags,
      kind,
      risk,
      availability: source.availability,
      sourceUrl,
      originalName: upstreamMeta.name,
      originalBody: upstreamBody,
    });
    writeFileSync(join(destDir, "SKILL.md"), generatedSkillMd);

    const upstreamSnapshotDir = join(destDir, "upstream");
    ensureDir(upstreamSnapshotDir);
    cpSync(skillPath, upstreamSnapshotDir, { recursive: true });

    imported++;
  }

  rmSync(dirname(cloneDir), { recursive: true, force: true });
  return imported;
}

function countRegistrySkills(): number {
  if (!existsSync(REGISTRY_SKILLS_DIR)) return 0;
  return readdirSync(REGISTRY_SKILLS_DIR, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  ).length;
}

function main(): void {
  ensureDir(REGISTRY_SKILLS_DIR);
  removeExistingImportedSkills();

  let totalImported = 0;
  for (const source of SOURCES) {
    const imported = importSource(source);
    totalImported += imported;
    console.log(
      `[sync-upstream] ${source.provider}:${source.skillsPath} -> imported ${imported}`,
    );
  }

  console.log(`[sync-upstream] imported total: ${totalImported}`);
  console.log(
    `[sync-upstream] registry skill directories: ${countRegistrySkills()}`,
  );
}

main();
