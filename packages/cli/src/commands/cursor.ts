import chalk from "chalk";
import { cpSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { getSkillsDir } from "@skillrunner/engine";

function getCursorSkillsDir(scope: "project" | "global"): string {
  if (scope === "global") {
    return join(process.env.HOME || "", ".cursor", "skills");
  }
  return join(process.cwd(), ".cursor", "skills");
}

export async function cursorInstallCmd(
  name: string,
  opts: { scope?: string },
  cmd?: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd?.opts?.()?.json;
  const scope = (opts.scope || "project") as "project" | "global";
  const skillsDir = getSkillsDir();

  if (!existsSync(skillsDir)) {
    if (json)
      console.log(
        JSON.stringify(
          { success: false, error: "No skills installed" },
          null,
          2,
        ),
      );
    else
      console.error(
        chalk.red('No skills installed. Run "skill install <name>" first.'),
      );
    process.exit(1);
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find(
    (e) =>
      e.isDirectory() && (e.name === name || e.name.startsWith(name + "@")),
  );
  if (!match) {
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

  const srcDir = join(skillsDir, match.name);
  const destDir = getCursorSkillsDir(scope);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, match.name.split("@")[0]);
  cpSync(srcDir, dest, { recursive: true });

  if (json) {
    console.log(JSON.stringify({ success: true, path: dest, scope }, null, 2));
  } else {
    console.log(
      chalk.green("Installed to Cursor:"),
      dest,
      chalk.dim(`(${scope})`),
    );
  }
}

export async function cursorListCmd(
  opts: { scope?: string },
  cmd?: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd?.opts?.()?.json;
  const scope = (opts.scope || "both") as "project" | "global" | "both";

  const dirs: { scope: string; path: string }[] = [];
  if (scope === "project" || scope === "both") {
    dirs.push({ scope: "project", path: getCursorSkillsDir("project") });
  }
  if (scope === "global" || scope === "both") {
    dirs.push({ scope: "global", path: getCursorSkillsDir("global") });
  }

  const result: Record<string, string[]> = {};
  for (const { scope: s, path: p } of dirs) {
    if (existsSync(p)) {
      result[s] = readdirSync(p, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } else {
      result[s] = [];
    }
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const [s, skills] of Object.entries(result)) {
    console.log(chalk.bold(`${s} skills:`));
    if (skills.length) skills.forEach((n) => console.log(`  ${n}`));
    else console.log(chalk.dim("  (none)"));
    console.log();
  }
}
