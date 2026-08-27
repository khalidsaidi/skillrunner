#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "module";
import { doctorCmd } from "./commands/doctor.js";
import { listCmd } from "./commands/list.js";
import { searchCmd } from "./commands/search.js";
import { infoCmd } from "./commands/info.js";
import { installCmd } from "./commands/install.js";
import { uninstallCmd } from "./commands/uninstall.js";
import { planCmd } from "./commands/plan.js";
import { runCmd } from "./commands/run.js";
import { logsCmd } from "./commands/logs.js";
import { openCmd } from "./commands/open.js";
import { cursorInstallCmd, cursorListCmd } from "./commands/cursor.js";
import { exportCmd } from "./commands/export.js";
import { auditCmd } from "./commands/audit.js";

const program = new Command();
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };
const cliVersion =
  typeof pkg.version === "string" && pkg.version.trim() ? pkg.version : "0.0.0";

const JSON_HELP = "Output JSON instead of text (for scripts and integrations)";

function example(lines: string[]): string {
  return `\nExample:\n${lines.map((l) => `  $ ${l}`).join("\n")}\n`;
}

program
  .name("skill")
  .description(
    "SkillRunner — audit, safely run, and export SKILL.md skills across Claude Code, Codex, Cursor, and opencode",
  )
  .version(cliVersion)
  .option("-j, --json", JSON_HELP);

program
  .command("doctor")
  .option("--json", JSON_HELP)
  .description(
    "Check your environment (node, git, registry, paths) — run this first, or when something misbehaves",
  )
  .addHelpText("after", example(["skill doctor"]))
  .action(doctorCmd);
program
  .command("list")
  .option("--json", JSON_HELP)
  .description(
    "List installed skills — see what you already have before installing more",
  )
  .addHelpText("after", example(["skill list"]))
  .action(listCmd);
program
  .command("search <query>")
  .option("--json", JSON_HELP)
  .description(
    "Search the skill registry by name, description, or tag — when you don't know the exact skill name",
  )
  .addHelpText("after", example(["skill search lint"]))
  .action(searchCmd);
program
  .command("info <name>")
  .option("--json", JSON_HELP)
  .description(
    "Show a skill's details (risk, capabilities, prerequisites) — read this before installing or running it",
  )
  .addHelpText("after", example(["skill info run-lint"]))
  .action(infoCmd);
program
  .command("install <source>")
  .option("--json", JSON_HELP)
  .option("--yes", "Skip confirmation for remote installs")
  .description(
    "Install a skill from the registry, a GitHub repo path (owner/repo[/path]), or a SKILL.md URL — remote sources are audited first",
  )
  .addHelpText(
    "after",
    example([
      "skill install run-lint",
      "skill install anthropics/skills/skills/pdf",
    ]),
  )
  .action(installCmd);
program
  .command("uninstall <name>")
  .option("--json", JSON_HELP)
  .description("Remove an installed skill — when you no longer need it")
  .addHelpText("after", example(["skill uninstall run-lint"]))
  .action(uninstallCmd);
program
  .command("plan <name>")
  .option("--json", JSON_HELP)
  .description(
    "Preview what a skill would execute (steps + risk) without running anything — use before the first `skill run`",
  )
  .option("--inputs <pairs...>", "input k=v")
  .addHelpText("after", example(["skill plan run-lint"]))
  .action(planCmd);
program
  .command("run <name>")
  .option("--json", JSON_HELP)
  .description(
    "Execute an installed automation skill (preflight → guard → confirm → run, with persisted artifacts)",
  )
  .option("--yes", "Skip confirmation")
  .option(
    "--inputs <pairs...>",
    "input k=v (exposed to scripts as INPUT_<NAME> env vars)",
  )
  .option("--cwd <dir>", "Working directory")
  .addHelpText(
    "after",
    example(["skill run run-lint", "skill run my-skill --inputs env=staging"]),
  )
  .action(runCmd);
program
  .command("logs")
  .option("--json", JSON_HELP)
  .description(
    "Show persisted run artifacts (plan, guard verdict, stdout/stderr) — use after a run to see what happened",
  )
  .option("--last", "Last run")
  .option("--id <runId>", "Run ID")
  .addHelpText("after", example(["skill logs --last"]))
  .action(logsCmd);
program
  .command("open")
  .option("--json", JSON_HELP)
  .description(
    "Open the local dashboard to browse skills and runs (works from a repo checkout only)",
  )
  .addHelpText("after", example(["skill open"]))
  .action(openCmd);
program
  .command("export <target> <names...>")
  .option("--json", JSON_HELP)
  .option("--scope <scope>", "global|project", "global")
  .option("--out <dir>", "Export into a custom directory")
  .option("--force", "Overwrite existing exported skills")
  .description(
    "Export skills as spec-pure SKILL.md directories into your agent's skills folder (claude, codex, cursor, opencode)",
  )
  .addHelpText(
    "after",
    example([
      "skill export claude run-lint",
      "skill export cursor run-lint --scope project",
    ]),
  )
  .action(exportCmd);
program
  .command("audit [target]")
  .option("--json", JSON_HELP)
  .description(
    "Static-audit skills for risky patterns before trusting them — a skills directory (e.g. ~/.claude/skills), an installed skill name, or everything installed",
  )
  .addHelpText(
    "after",
    example(["skill audit ~/.claude/skills", "skill audit --json"]),
  )
  .action(auditCmd);
const cursorCmd = new Command("cursor").description(
  "(deprecated) Cursor integration — use `skill export cursor <name>` instead",
);
cursorCmd
  .command("install <name>")
  .description("(deprecated) Alias for `skill export cursor <name>`")
  .option("--json", JSON_HELP)
  .option("--scope <scope>", "project|global", "project")
  .addHelpText("after", example(["skill export cursor run-lint"]))
  .action(cursorInstallCmd);
cursorCmd
  .command("list")
  .description("List skills in the Cursor skills folders")
  .option("--json", JSON_HELP)
  .option("--scope <scope>", "project|global|both", "both")
  .action(cursorListCmd);
program.addCommand(cursorCmd);

program.parse();
