import chalk from "chalk";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseSkillMd, buildPlan, getSkillsDir } from "@skillrunner/engine";

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
  opts: { inputs?: string[] },
  cmd: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd.opts().json;
  const skillDir = findSkillDir(name);

  if (!skillDir) {
    if (json) {
      console.log(
        JSON.stringify({ error: `Skill not installed: ${name}` }, null, 2),
      );
    } else {
      console.error(chalk.red("Skill not installed:"), name);
    }
    process.exit(1);
  }

  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    if (json)
      console.log(JSON.stringify({ error: "SKILL.md not found" }, null, 2));
    else console.error(chalk.red("SKILL.md not found"));
    process.exit(1);
  }

  const meta = parseSkillMd(readFileSync(skillMd, "utf-8"));
  const plan = buildPlan(skillDir, meta);

  if (json) {
    console.log(JSON.stringify({ skill: meta.name, plan }, null, 2));
    return;
  }

  console.log(chalk.bold(meta.name));
  console.log(chalk.dim(meta.description));
  console.log(chalk.dim(`Risk: ${plan.risk}\n`));
  console.log("Steps:");
  plan.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.cmd}`));
}
