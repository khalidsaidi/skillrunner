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

program
  .name("skill")
  .description(
    "SkillRunner — audit, safely run, and export SKILL.md skills across Claude Code, Codex, Cursor, and opencode",
  )
  .version(cliVersion)
  .option("-j, --json", "Output JSON for extension integration");

program
  .command("doctor")
  .option("--json")
  .description("Check env, providers, registry")
  .action(doctorCmd);
program
  .command("list")
  .option("--json")
  .description("List installed skills")
  .action(listCmd);
program
  .command("search <query>")
  .option("--json")
  .description("Search registry")
  .action(searchCmd);
program
  .command("info <name>")
  .option("--json")
  .description("Show skill details")
  .action(infoCmd);
program
  .command("install <source>")
  .option("--json")
  .option("--yes", "Skip confirmation for remote installs")
  .description(
    "Install a skill from the registry, a GitHub repo path (owner/repo[/path]), or a SKILL.md URL — remote sources are audited first",
  )
  .action(installCmd);
program
  .command("uninstall <name>")
  .option("--json")
  .description("Uninstall skill")
  .action(uninstallCmd);
program
  .command("plan <name>")
  .option("--json")
  .description("Show plan only")
  .option("--inputs <pairs...>", "input k=v")
  .action(planCmd);
program
  .command("run <name>")
  .option("--json")
  .description("Run skill")
  .option("--yes", "Skip confirmation")
  .option(
    "--inputs <pairs...>",
    "input k=v (exposed to scripts as INPUT_<NAME> env vars)",
  )
  .option("--cwd <dir>", "Working directory")
  .action(runCmd);
program
  .command("logs")
  .option("--json")
  .description("Show run logs")
  .option("--last", "Last run")
  .option("--id <runId>", "Run ID")
  .action(logsCmd);
program
  .command("open")
  .option("--json")
  .description("Open dashboard (repo checkout only)")
  .action(openCmd);
program
  .command("export <target> <names...>")
  .option("--json")
  .option("--scope <scope>", "global|project", "global")
  .option("--out <dir>", "Export into a custom directory")
  .option("--force", "Overwrite existing exported skills")
  .description(
    "Export skills as spec-pure SKILL.md directories for claude, codex, cursor, or opencode",
  )
  .action(exportCmd);
program
  .command("audit [target]")
  .option("--json")
  .description(
    "Static-audit skills for risky patterns — a skills directory (e.g. ~/.claude/skills), an installed skill name, or everything installed",
  )
  .action(auditCmd);
const cursorCmd = new Command("cursor").description("Cursor integration");
cursorCmd
  .command("install <name>")
  .option("--json")
  .option("--scope <scope>", "project|global", "project")
  .action(cursorInstallCmd);
cursorCmd
  .command("list")
  .option("--json")
  .option("--scope <scope>", "project|global|both", "both")
  .action(cursorListCmd);
program.addCommand(cursorCmd);

program.parse();
