import chalk from "chalk";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import {
  loadSkillMetaFromDir,
  getSkillsDir,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

export async function listCmd(
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const skillsDir = getSkillsDir();

  const skills: {
    name: string;
    version?: string;
    description?: string;
    availability?: "default" | "advanced" | "conditional";
  }[] = [];
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillDir = join(skillsDir, entry.name);
        try {
          const loaded = loadSkillMetaFromDir(skillDir);
          skills.push({
            name: loaded.meta.name,
            version: loaded.meta.version,
            description: loaded.meta.description,
            availability: loaded.meta.availability,
          });
        } catch {
          skills.push({
            name: entry.name,
            version: undefined,
            description: undefined,
          });
        }
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ skills }, null, 2));
    return;
  }

  console.log(chalk.bold("Installed skills:\n"));
  if (skills.length === 0) {
    console.log(chalk.dim('  (none) — use "skill install <name>" to install'));
    return;
  }
  for (const s of skills) {
    console.log(
      `  ${chalk.cyan(s.name)}${s.version ? chalk.dim(`@${s.version}`) : ""}${chalk.dim(` [${s.availability || "default"}]`)}`,
    );
    if (s.description) console.log(`    ${chalk.dim(s.description)}`);
  }
}
