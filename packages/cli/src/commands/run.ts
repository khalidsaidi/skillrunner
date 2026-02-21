import chalk from "chalk";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import prompts from "prompts";
import {
  parseSkillMd,
  buildPlan,
  scanScriptForBannedPatterns,
  blockMessage,
  executePlan,
  writeRunArtifacts,
  checkSkillPrerequisites,
  getSkillsDir,
} from "@khalidsaidi/skillrunner-engine";
import { randomUUID } from "crypto";
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

export async function runCmd(
  name: string,
  opts: {
    yes?: boolean;
    cwd?: string;
    allowDirty?: boolean;
    noBranch?: boolean;
    json?: boolean;
  },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const cwd = opts.cwd || process.cwd();
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
    if (json)
      console.log(
        JSON.stringify(
          { success: false, error: "SKILL.md not found" },
          null,
          2,
        ),
      );
    else console.error(chalk.red("SKILL.md not found"));
    process.exit(1);
  }

  const meta = parseSkillMd(readFileSync(skillMd, "utf-8"));
  const plan = buildPlan(skillDir, meta);
  const preflight = checkSkillPrerequisites(meta, cwd);

  if (!preflight.passed) {
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: "Preflight check failed",
            preflight,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Preflight check failed."));
      if (preflight.missingTools.length) {
        console.error(
          chalk.dim(`  Missing tools: ${preflight.missingTools.join(", ")}`),
        );
      }
      if (preflight.missingFiles.length) {
        console.error(
          chalk.dim(`  Missing files: ${preflight.missingFiles.join(", ")}`),
        );
      }
      if (preflight.missingEnv.length) {
        console.error(
          chalk.dim(
            `  Missing env vars: ${preflight.missingEnv
              .map((v) => `$${v}`)
              .join(", ")}`,
          ),
        );
      }
      if (preflight.missingPackageJsonDeps.length) {
        console.error(
          chalk.dim(
            `  Missing package.json deps: ${preflight.missingPackageJsonDeps.join(", ")}`,
          ),
        );
      }
      console.error(chalk.dim(`  Skill: ${meta.name}`));
    }
    process.exit(1);
  }

  const checkPath = meta.scripts?.check
    ? join(skillDir, meta.scripts.check)
    : join(skillDir, "scripts", "check.sh");
  const runPath = meta.scripts?.run
    ? join(skillDir, meta.scripts.run)
    : join(skillDir, "scripts", "run.sh");
  const guardCheck = scanScriptForBannedPatterns(checkPath);
  const guardRun = scanScriptForBannedPatterns(runPath);
  const guardResult = {
    passed: guardCheck.passed && guardRun.passed,
    violations: [...guardCheck.violations, ...guardRun.violations],
  };

  if (!guardResult.passed) {
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: "Guard block",
            violations: guardResult.violations,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red(blockMessage(guardResult.violations)));
    }
    process.exit(1);
  }

  if (!opts.yes && !json) {
    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Run ${meta.name}? (${plan.steps.length} step(s), risk: ${plan.risk})`,
      initial: false,
    });
    if (!confirm) {
      console.log(chalk.dim("Cancelled."));
      return;
    }
  }

  const runId = randomUUID();
  writeRunArtifacts(runId, meta.name, cwd, plan, guardResult);

  const results = await executePlan(cwd, skillDir, plan, runId);
  const last = results[results.length - 1];
  const success = last ? last.success : true;
  const exitCode = last ? last.exitCode : 0;

  writeRunArtifacts(
    runId,
    meta.name,
    cwd,
    plan,
    guardResult,
    last
      ? {
          success,
          stdout: last.stdout,
          stderr: last.stderr,
          exitCode,
        }
      : undefined,
  );

  if (json) {
    console.log(
      JSON.stringify(
        {
          success,
          runId,
          exitCode,
          stdout: last?.stdout,
          stderr: last?.stderr,
        },
        null,
        2,
      ),
    );
    if (!success) {
      process.exit(exitCode || 1);
    }
  } else {
    if (success) {
      console.log(chalk.green("Done."), chalk.dim(`Run ID: ${runId}`));
    } else {
      console.error(chalk.red("Failed."), chalk.dim(`Run ID: ${runId}`));
      if (last?.stderr) console.error(chalk.dim(last.stderr));
      process.exit(exitCode || 1);
    }
  }
}
