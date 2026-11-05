import chalk from "chalk";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import prompts from "prompts";
import {
  auditSkillDir,
  buildPlan,
  fetchSkillFromGitHub,
  fetchSkillFromUrl,
  getSkillFromIndex,
  getRegistrySkillSlug,
  getSkillsDir,
  inferSkillContractType,
  loadSkillMetaFromDir,
  parseInstallSource,
  parseSkillContract,
  resolveRegistryIndex,
  resolveRegistryRoot,
  writeFetchedSkill,
  type FetchedSkill,
  type RegistryIndex,
  type RegistrySkill,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";
import { didYouMeanLine, suggestForName } from "../utils/suggest.js";

function isNetworkError(e: Error): boolean {
  const text = `${e.message} ${(e.cause as Error | undefined)?.message || ""}`;
  return /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ETIMEDOUT|ERR_SOCKET|network|abort/i.test(
    text,
  );
}

function describeFetchError(e: Error, host: string): string {
  if (isNetworkError(e)) {
    return `Could not reach ${host} — check your network connection and try again.`;
  }
  return `Fetch failed: ${e.message}`;
}

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

function sanitizeInstallDirName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "skill"
  );
}

/**
 * Install a skill fetched from outside the registry (GitHub repo path or
 * plain URL), running the same trust pipeline the registry skills get:
 * parse the contract, build the plan, and static-audit every script
 * before anything lands in the skills directory.
 */
async function installFromFetched(
  fetchedPromise: Promise<FetchedSkill>,
  opts: { json?: boolean; yes?: boolean },
  json: boolean,
  sourceHost = "the skill source",
): Promise<void> {
  let fetched: FetchedSkill;
  try {
    fetched = await fetchedPromise;
  } catch (e) {
    const message = describeFetchError(e as Error, sourceHost);
    if (json) {
      console.log(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      console.error(chalk.red(message));
    }
    process.exit(1);
    return;
  }

  const stagingDir = mkdtempSync(join(tmpdir(), "skillrunner-install-"));
  try {
    writeFetchedSkill(stagingDir, fetched);

    let loaded;
    try {
      loaded = loadSkillMetaFromDir(stagingDir);
    } catch (e) {
      throw new Error(
        `Invalid SKILL.md/skill definition: ${(e as Error).message}`,
      );
    }
    const meta = loaded.meta;
    const plan = buildPlan(stagingDir, meta);
    const audit = auditSkillDir(stagingDir);
    const blocks = audit.findings.filter((f) => f.severity === "block");
    const warns = audit.findings.filter((f) => f.severity !== "block");

    if (blocks.length > 0) {
      const detail = blocks
        .map((f) => `${f.file}:${f.line} [${f.ruleId}] ${f.message}`)
        .join("; ");
      if (json) {
        console.log(
          JSON.stringify(
            {
              success: false,
              error: "Blocked by audit",
              source: fetched.sourceUrl,
              findings: audit.findings,
            },
            null,
            2,
          ),
        );
      } else {
        console.error(
          chalk.red("Install blocked by audit:"),
          fetched.sourceUrl,
        );
        for (const f of blocks) {
          console.error(
            `  ${chalk.red("BLOCK")} ${f.file}:${f.line} [${f.ruleId}] ${f.message}`,
          );
          if (f.excerpt) console.error(chalk.dim(`        ${f.excerpt}`));
        }
      }
      process.exitCode = 2;
      throw new Error(`Blocked by audit: ${detail}`);
    }

    if (!json && !opts.yes) {
      console.log(chalk.bold(`Install ${meta.name}`));
      console.log(chalk.dim(`  Source: ${fetched.sourceUrl}`));
      console.log(chalk.dim(`  Files: ${fetched.files.length}`));
      console.log(
        chalk.dim(
          `  Plan: ${plan.steps.length} executable step(s), risk: ${plan.risk}${
            meta.kind ? `, kind: ${meta.kind}` : ""
          }`,
        ),
      );
      if (warns.length > 0) {
        console.log(chalk.yellow(`  Audit warnings (${warns.length}):`));
        for (const f of warns) {
          console.log(
            chalk.yellow(`    ${f.file}:${f.line} [${f.ruleId}] ${f.message}`),
          );
        }
      } else {
        console.log(chalk.green("  Audit: clean"));
      }
      const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Install ${meta.name}?`,
        initial: warns.length === 0,
      });
      if (!confirm) {
        console.log(chalk.dim("Cancelled."));
        return;
      }
    }

    const skillsDir = getSkillsDir();
    mkdirSync(skillsDir, { recursive: true });
    const slug = sanitizeInstallDirName(meta.name);
    const destDir = join(skillsDir, `${slug}@${meta.version || "latest"}`);
    rmSync(destDir, { recursive: true, force: true });
    cpSync(stagingDir, destDir, { recursive: true });

    if (json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            name: meta.name,
            slug,
            path: destDir,
            source: fetched.sourceUrl,
            plan,
            audit: {
              findings: audit.findings,
              scannedFiles: audit.scannedFiles.length,
            },
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        chalk.green("Installed:"),
        meta.name,
        chalk.dim(`→ ${destDir}`),
      );
      console.log(chalk.dim(`  From: ${fetched.sourceUrl}`));
    }
  } catch (e) {
    if (!json && process.exitCode !== 2) {
      console.error(chalk.red("Install failed:"), (e as Error).message);
    } else if (json && process.exitCode !== 2) {
      console.log(
        JSON.stringify(
          { success: false, error: (e as Error).message },
          null,
          2,
        ),
      );
    }
    process.exit(process.exitCode || 1);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

export async function installCmd(
  name: string,
  opts: { json?: boolean; yes?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);

  const source = parseInstallSource(name);
  if (source.type === "github") {
    await installFromFetched(
      fetchSkillFromGitHub(source),
      opts,
      json,
      "github.com",
    );
    return;
  }
  if (source.type === "url") {
    let host = "the skill URL";
    try {
      host = new URL(source.url).host || host;
    } catch {
      // keep generic label
    }
    await installFromFetched(fetchSkillFromUrl(source.url), opts, json, host);
    return;
  }

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
    const suggestions = await suggestForName(name, { index });
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: `Skill not found: ${name}`, suggestions },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Skill not found:"), name);
      const hint = didYouMeanLine(suggestions);
      if (hint) console.error(chalk.dim(hint));
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
