import chalk from "chalk";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  parseSkillMd,
  buildPlan,
  getSkillsDir,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

function findSkillDir(name: string): string | null {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) return null;
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find(
    (e: { name: string; isDirectory: () => boolean }) =>
      e.isDirectory() && (e.name === name || e.name.startsWith(name + "@")),
  );
  return match ? join(skillsDir, match.name) : null;
}

export async function planCmd(
  name: string,
  opts: { inputs?: string[]; json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const skillDir = findSkillDir(name);

  if (!skillDir) {
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: `Skill not installed: ${name}` },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Skill not installed:"), name);
    }
    process.exit(1);
  }

  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: "SKILL.md not found" },
          null,
          2,
        ),
      );
    } else console.error(chalk.red("SKILL.md not found"));
    process.exit(1);
  }

  const meta = parseSkillMd(readFileSync(skillMd, "utf-8"));
  const plan = buildPlan(skillDir, meta);

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          skill: meta.name,
          availability: meta.availability || "default",
          prerequisites: meta.prerequisites || {},
          plan,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(chalk.bold(meta.name));
  console.log(chalk.dim(meta.description));
  console.log(chalk.dim(`Risk: ${plan.risk}\n`));
  if (meta.availability) {
    console.log(chalk.dim(`Availability: ${meta.availability}`));
  }
  if (meta.prerequisites) {
    const tools = meta.prerequisites.tools || [];
    const files = meta.prerequisites.files || [];
    const env = meta.prerequisites.env || [];
    const packageJsonDeps = meta.prerequisites.packageJsonDeps || [];
    if (tools.length || files.length || env.length || packageJsonDeps.length) {
      console.log(chalk.dim("Prerequisites:"));
      if (tools.length) console.log(chalk.dim(`  tools: ${tools.join(", ")}`));
      if (files.length) console.log(chalk.dim(`  files: ${files.join(", ")}`));
      if (env.length) {
        console.log(chalk.dim(`  env: ${env.map((v) => `$${v}`).join(", ")}`));
      }
      if (packageJsonDeps.length) {
        console.log(
          chalk.dim(`  packageJsonDeps: ${packageJsonDeps.join(", ")}`),
        );
      }
    }
  }
  console.log("Steps:");
  plan.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.cmd}`));
}
