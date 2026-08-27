import chalk from "chalk";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { shouldUseJson } from "../utils/json.js";
import { exportCmd } from "./export.js";

function getCursorSkillsDir(scope: "project" | "global"): string {
  if (scope === "global") {
    return join(process.env.HOME || "", ".cursor", "skills");
  }
  return join(process.cwd(), ".cursor", "skills");
}

/**
 * Deprecated: `skill cursor install` is an alias for `skill export cursor`.
 * Kept so existing invocations keep working, with a nudge to the real command.
 */
export async function cursorInstallCmd(
  name: string,
  opts: { scope?: string; json?: boolean },
  cmd?: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const scope = opts.scope === "global" ? "global" : "project";
  if (!json) {
    console.error(
      chalk.yellow(
        `Note: "skill cursor install" is deprecated — use "skill export cursor ${name}${
          scope === "project" ? " --scope project" : ""
        }" instead.`,
      ),
    );
  }
  await exportCmd(
    "cursor",
    [name],
    { scope, json: opts.json },
    cmd as Parameters<typeof exportCmd>[3],
  );
}

export async function cursorListCmd(
  opts: { scope?: string; json?: boolean },
  cmd?: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
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
