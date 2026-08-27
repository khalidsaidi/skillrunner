import chalk from "chalk";
import {
  resolveRegistryIndex,
  getSkillFromIndex,
  loadSkillMetaFromDir,
  getSkillsDir,
} from "@khalidsaidi/skillrunner-engine";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { shouldUseJson } from "../utils/json.js";
import {
  didYouMeanLine,
  installedSkillNames,
  suggestForName,
} from "../utils/suggest.js";

function findInstalledSkillDir(name: string): string | null {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) return null;

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find(
    (e) =>
      e.isDirectory() && (e.name === name || e.name.startsWith(`${name}@`)),
  );

  return match ? join(skillsDir, match.name) : null;
}

export async function infoCmd(
  name: string,
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  let skill;
  const localPath = findInstalledSkillDir(name);
  if (localPath) {
    try {
      const loaded = loadSkillMetaFromDir(localPath);
      skill = {
        name: loaded.meta.name,
        description: loaded.meta.description,
        version: loaded.meta.version,
        tags: loaded.meta.tags,
        kind: loaded.meta.kind,
        risk: loaded.meta.risk,
        availability: loaded.meta.availability,
        prerequisites: loaded.meta.prerequisites,
        capabilities: loaded.meta.capabilities,
        scripts: loaded.meta.scripts,
        inputs: loaded.meta.inputs,
        contract: loaded.contract,
        paths: {
          dir: localPath,
          skill_md: join(localPath, loaded.contract.file),
          raw_skill_md: "",
          contract: join(localPath, loaded.contract.file),
          raw_contract: "",
        },
      };
    } catch {
      // fall through to registry lookup
    }
  }

  let idx;
  if (!skill) {
    try {
      idx = await resolveRegistryIndex();
      skill = getSkillFromIndex(idx, name);
    } catch (e) {
      if (json) {
        console.log(JSON.stringify({ error: (e as Error).message }, null, 2));
      } else {
        console.error(chalk.red("Registry unreachable:"), (e as Error).message);
      }
      process.exit(1);
    }
  }

  if (!skill) {
    const suggestions = await suggestForName(name, {
      index: idx,
      extraCandidates: installedSkillNames(),
    });
    if (json) {
      console.log(
        JSON.stringify({ error: "Skill not found", suggestions }, null, 2),
      );
    } else {
      console.error(chalk.red("Skill not found:"), name);
      const hint = didYouMeanLine(suggestions);
      if (hint) console.error(chalk.dim(hint));
    }
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  console.log(chalk.bold(skill.name));
  if (skill.version) console.log(chalk.dim(`Version: ${skill.version}`));
  console.log(chalk.dim(`Kind: ${skill.kind || "unknown"}`));
  console.log(chalk.dim(`Risk: ${skill.risk || "low"}`));
  console.log(chalk.dim(`Availability: ${skill.availability || "default"}`));
  console.log();
  console.log(skill.description);
  if (skill.prerequisites) {
    const tools = Array.isArray(skill.prerequisites.tools)
      ? skill.prerequisites.tools
      : [];
    const files = Array.isArray(skill.prerequisites.files)
      ? skill.prerequisites.files
      : [];
    const env = Array.isArray(skill.prerequisites.env)
      ? skill.prerequisites.env
      : [];
    const packageJsonDeps = Array.isArray(skill.prerequisites.packageJsonDeps)
      ? skill.prerequisites.packageJsonDeps
      : [];
    if (tools.length || files.length || env.length || packageJsonDeps.length) {
      console.log(chalk.dim("\nPrerequisites:"));
      if (tools.length) console.log(chalk.dim(`  tools: ${tools.join(", ")}`));
      if (files.length) console.log(chalk.dim(`  files: ${files.join(", ")}`));
      if (env.length)
        console.log(chalk.dim(`  env: ${env.map((v) => `$${v}`).join(", ")}`));
      if (packageJsonDeps.length) {
        console.log(
          chalk.dim(`  packageJsonDeps: ${packageJsonDeps.join(", ")}`),
        );
      }
    }
  }
  if (skill.tags?.length)
    console.log(chalk.dim("\nTags: " + skill.tags.join(", ")));
}
