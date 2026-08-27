import chalk from "chalk";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  EXPORT_TARGETS,
  exportSkill,
  getRegistrySkillSlug,
  getSkillFromIndex,
  getSkillsDir,
  resolveExportDir,
  resolveExportTarget,
  resolveRegistryIndex,
  resolveRegistryRoot,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

function findInstalledSkillDir(name: string): string | null {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) return null;
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && (e.name === name || e.name.startsWith(name + "@")),
  );
  return match ? join(skillsDir, match.name) : null;
}

async function resolveSkillSourceDir(name: string): Promise<string | null> {
  const installed = findInstalledSkillDir(name);
  if (installed) return installed;

  const root = resolveRegistryRoot();
  if (root) {
    const direct = join(root, "registry", "skills", name);
    if (existsSync(direct)) return direct;
    try {
      const index = await resolveRegistryIndex();
      const skill = getSkillFromIndex(index, name);
      if (skill) {
        const slug = getRegistrySkillSlug(skill) || skill.name;
        const dir = join(root, "registry", "skills", slug);
        if (existsSync(dir)) return dir;
      }
    } catch {
      // registry unavailable; fall through
    }
  }
  return null;
}

export async function exportCmd(
  target: string,
  names: string[],
  opts: {
    scope?: string;
    out?: string;
    force?: boolean;
    json?: boolean;
  },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const targetDef = resolveExportTarget(target);
  if (!targetDef) {
    const known = EXPORT_TARGETS.map((t) =>
      t.aliases.length ? `${t.id} (${t.aliases.join(", ")})` : t.id,
    ).join(", ");
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: `Unknown target: ${target}. Known targets: ${known}` },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Unknown target:"), target);
      console.error(chalk.dim(`Known targets: ${known}`));
    }
    process.exit(1);
  }

  const scope = opts.scope === "project" ? "project" : "global";
  const destRoot = opts.out || resolveExportDir(targetDef, scope);

  const results: {
    skill: string;
    name?: string;
    dest?: string;
    usedUpstream?: boolean;
    error?: string;
  }[] = [];
  let failed = false;

  for (const name of names) {
    const sourceDir = await resolveSkillSourceDir(name);
    if (!sourceDir) {
      failed = true;
      results.push({
        skill: name,
        error: `Skill not found (not installed, not in the registry): ${name}`,
      });
      continue;
    }
    try {
      const r = exportSkill(sourceDir, destRoot, { force: opts.force });
      results.push({
        skill: name,
        name: r.name,
        dest: r.destDir,
        usedUpstream: r.usedUpstream,
      });
    } catch (e) {
      failed = true;
      results.push({ skill: name, error: (e as Error).message });
    }
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: !failed,
          target: targetDef.id,
          scope,
          destRoot,
          results,
        },
        null,
        2,
      ),
    );
  } else {
    for (const r of results) {
      if (r.error) {
        console.error(chalk.red("Export failed:"), r.skill, chalk.dim(r.error));
      } else {
        const provenance = r.usedUpstream
          ? "pristine upstream copy"
          : "spec-normalized";
        console.log(
          chalk.green("Exported:"),
          `${r.skill} → ${r.dest}`,
          chalk.dim(`(${provenance})`),
        );
      }
    }
    if (results.some((r) => !r.error)) {
      console.log(
        chalk.dim(
          `${targetDef.label} reads skills from ${destRoot} — restart or reload the agent to pick them up.`,
        ),
      );
    }
  }
  if (failed) process.exit(1);
}
