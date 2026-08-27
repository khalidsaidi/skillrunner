import chalk from "chalk";
import {
  cpSync,
  mkdirSync,
  existsSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "fs";
import { dirname, join } from "path";
import {
  getSkillFromIndex,
  getRegistrySkillSlug,
  getSkillsDir,
  inferSkillContractType,
  parseSkillContract,
  resolveRegistryIndex,
  resolveRegistryRoot,
  type RegistryIndex,
  type RegistrySkill,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

function normalizeRelativePath(path: string): string {
  return path.replace(/^\.\/+/, "");
}

function toSkillRelativePath(path: string, skillSlug: string): string {
  const normalized = normalizeRelativePath(path);
  const canonicalPrefix = `registry/skills/${skillSlug}/`;
  if (normalized.startsWith(canonicalPrefix)) {
    return normalized.slice(canonicalPrefix.length);
  }
  const slugMarker = `/${skillSlug}/`;
  const markerIndex = normalized.lastIndexOf(slugMarker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + slugMarker.length);
  }
  return normalized;
}

function dedupe(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function isHttpUrl(value: string | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildSkillFileUrls(
  index: RegistryIndex,
  skill: RegistrySkill,
  relativePath: string,
): string[] {
  const skillSlug = getRegistrySkillSlug(skill) || skill.name;
  const normalizedPath = toSkillRelativePath(relativePath, skillSlug);
  const contractPath = toSkillRelativePath(
    skill.paths?.contract || skill.paths?.skill_md || "SKILL.md",
    skillSlug,
  );
  const candidates: string[] = [];
  const rawSkillMd = skill.paths?.raw_skill_md;
  const rawContract = skill.paths?.raw_contract || rawSkillMd;

  if (normalizedPath === contractPath && isHttpUrl(rawContract)) {
    candidates.push(rawContract);
  }
  if (normalizedPath === "SKILL.md" && isHttpUrl(rawSkillMd)) {
    candidates.push(rawSkillMd);
  }

  const skillBases: string[] = [];
  if (
    isHttpUrl(rawContract) &&
    rawContract.endsWith(`/${normalizeRelativePath(contractPath)}`)
  ) {
    skillBases.push(
      rawContract.slice(0, -`/${normalizeRelativePath(contractPath)}`.length),
    );
  }
  if (isHttpUrl(rawSkillMd) && rawSkillMd.endsWith("/SKILL.md")) {
    skillBases.push(rawSkillMd.slice(0, -"/SKILL.md".length));
  }
  if (isHttpUrl(index.source?.base_url)) {
    skillBases.push(
      `${stripTrailingSlashes(index.source.base_url)}/${skillSlug}`,
    );
  }

  for (const base of dedupe(skillBases)) {
    candidates.push(`${stripTrailingSlashes(base)}/${normalizedPath}`);
  }

  return dedupe(candidates);
}

async function fetchFirstText(
  urls: string[],
): Promise<{ url: string; body: string } | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return { url, body: await res.text() };
    } catch {
      // try next URL
    }
  }
  return null;
}

function writeDownloadedFile(
  destDir: string,
  relativePath: string,
  content: string,
): void {
  const normalizedPath = normalizeRelativePath(relativePath);
  const target = join(destDir, normalizedPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  if (normalizedPath.endsWith(".sh")) {
    chmodSync(target, 0o755);
  }
}

async function installSkillFromRemote(
  index: RegistryIndex,
  skill: RegistrySkill,
  destDir: string,
): Promise<void> {
  const skillSlug = getRegistrySkillSlug(skill) || skill.name;
  const contractRelativePath = toSkillRelativePath(
    skill.paths?.contract || skill.paths?.skill_md || "SKILL.md",
    skillSlug,
  );
  const contractUrls = buildSkillFileUrls(index, skill, contractRelativePath);
  const contractFile = await fetchFirstText(contractUrls);
  if (!contractFile) {
    throw new Error(
      `Could not download contract "${contractRelativePath}" for ${skillSlug}`,
    );
  }

  writeDownloadedFile(destDir, contractRelativePath, contractFile.body);
  const meta = parseSkillContract(contractFile.body, {
    contractType: inferSkillContractType(contractRelativePath),
    sourcePath: contractRelativePath,
    fallbackName: skill.name,
  });

  const requiredScripts = new Set<string>();
  if (meta.scripts?.check) {
    requiredScripts.add(normalizeRelativePath(meta.scripts.check));
  }
  if (meta.scripts?.run) {
    requiredScripts.add(normalizeRelativePath(meta.scripts.run));
  }

  const optionalScripts = ["scripts/check.sh", "scripts/run.sh"].filter(
    (p) => !requiredScripts.has(p),
  );

  const scriptPaths = [...requiredScripts, ...optionalScripts];
  for (const scriptPath of scriptPaths) {
    const scriptUrls = buildSkillFileUrls(index, skill, scriptPath);
    const script = await fetchFirstText(scriptUrls);
    if (!script) {
      if (requiredScripts.has(scriptPath)) {
        throw new Error(
          `Could not download required script "${scriptPath}" for ${skillSlug}`,
        );
      }
      continue;
    }

    writeDownloadedFile(destDir, scriptPath, script.body);
  }
}

export async function installCmd(
  name: string,
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);

  let index;
  try {
    index = await resolveRegistryIndex();
  } catch (e) {
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: (e as Error).message },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Registry unreachable:"), (e as Error).message);
    }
    process.exit(1);
  }

  const skill = getSkillFromIndex(index, name);
  if (!skill) {
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: `Skill not found: ${name}` },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Skill not found:"), name);
    }
    process.exit(1);
  }

  const skillsDir = getSkillsDir();
  mkdirSync(skillsDir, { recursive: true });
  const skillSlug = getRegistrySkillSlug(skill) || skill.name;
  const destDir = join(skillsDir, `${skillSlug}@${skill.version || "latest"}`);
  rmSync(destDir, { recursive: true, force: true });

  try {
    const repoRoot = resolveRegistryRoot();
    const sourceDir = repoRoot
      ? join(repoRoot, "registry", "skills", skillSlug)
      : "";

    if (sourceDir && existsSync(sourceDir)) {
      cpSync(sourceDir, destDir, { recursive: true });
    } else {
      await installSkillFromRemote(index, skill, destDir);
    }
  } catch (e) {
    rmSync(destDir, { recursive: true, force: true });
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: `Install failed: ${(e as Error).message}`,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Install failed:"), (e as Error).message);
    }
    process.exit(1);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          name: skill.name,
          slug: skillSlug,
          path: destDir,
        },
        null,
        2,
      ),
    );
  } else {
    const label =
      skillSlug === skill.name ? skill.name : `${skill.name} (${skillSlug})`;
    console.log(chalk.green("Installed:"), label, chalk.dim(`→ ${destDir}`));
  }
}
