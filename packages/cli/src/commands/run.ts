import chalk from "chalk";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import prompts from "prompts";
import {
  loadSkillMetaFromDir,
  buildPlan,
  scanScriptForBannedPatterns,
  blockMessage,
  executePlan,
  writeRunArtifacts,
  checkSkillPrerequisites,
  getRunsDir,
  getSkillsDir,
} from "@khalidsaidi/skillrunner-engine";
import { randomUUID } from "crypto";
import { shouldUseJson } from "../utils/json.js";
import {
  didYouMeanLine,
  installedSkillNames,
  suggestForName,
} from "../utils/suggest.js";

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

function parseInputPairs(pairs: string[] | undefined): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const pair of pairs || []) {
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    inputs[pair.slice(0, eq).trim()] = pair.slice(eq + 1);
  }
  return inputs;
}

export async function runCmd(
  name: string,
  opts: {
    yes?: boolean;
    cwd?: string;
    inputs?: string[];
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
    const suggestions = await suggestForName(name, {
      extraCandidates: installedSkillNames(),
    });
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: `Skill not installed: ${name}`,
            suggestions,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red("Skill not installed:"), name);
      const hint = didYouMeanLine(suggestions);
      if (hint) console.error(chalk.dim(hint));
    }
    process.exit(1);
  }

  let metaResult: ReturnType<typeof loadSkillMetaFromDir> | null = null;
  try {
    metaResult = loadSkillMetaFromDir(skillDir);
  } catch (e) {
    if (json) {
      console.log(
        JSON.stringify(
          { success: false, error: (e as Error).message },
          null,
          2,
        ),
      );
    } else {
      console.error(chalk.red((e as Error).message));
    }
    process.exit(1);
  }
  if (!metaResult) process.exit(1);
  const meta = metaResult.meta;
  const plan = buildPlan(skillDir, meta);

  if (plan.steps.length === 0) {
    // Nothing executable: knowledge skills are instructions for an agent,
    // not scripts for this runner. Say so instead of pretending we ran.
    const isKnowledge = meta.kind === "knowledge" || !meta.scripts;
    const message = isKnowledge
      ? `${meta.name} is a knowledge skill — instructions for an agent, nothing for skillrunner to execute.`
      : `${meta.name} declares no runnable scripts (scripts/check.sh or scripts/run.sh), so there is nothing to execute.`;
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            executed: false,
            kind: meta.kind,
            message,
            hint: `skill export claude ${name}`,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(chalk.yellow("Nothing to execute."), message);
      console.log(
        chalk.dim(
          `Put it where your agent can use it instead: skill export claude ${name} (targets: claude, codex, cursor, opencode)`,
        ),
      );
    }
    return;
  }

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

  const inputs: Record<string, string> = {};
  for (const [key, def] of Object.entries(meta.inputs || {})) {
    if (def && typeof def === "object" && def.default !== undefined) {
      inputs[key] = String(def.default);
    }
  }
  Object.assign(inputs, parseInputPairs(opts.inputs));

  const runId = randomUUID();
  writeRunArtifacts(runId, meta.name, cwd, plan, guardResult);

  const results = await executePlan(cwd, skillDir, plan, { inputs });
  const last = results[results.length - 1];
  const success = last ? last.success : true;
  const exitCode = last ? last.exitCode : 0;
  const failureOutput = !success
    ? last?.stderr?.trim() || last?.stdout?.trim() || ""
    : "";
  const failureLines = failureOutput.split("\n").filter((l) => l.trim());
  const failureMessage = !success
    ? failureLines.slice(-5).join("\n") ||
      `Skill script failed (exit code ${exitCode})`
    : undefined;

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
          error: failureMessage,
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
    const artifactsDir = join(getRunsDir(), runId);
    if (success) {
      const stdoutLines = (last?.stdout || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const resultLine = stdoutLines[stdoutLines.length - 1];
      console.log(chalk.green("Done."), chalk.dim(`Run ID: ${runId}`));
      if (resultLine) console.log(`  Result: ${resultLine}`);
      console.log(chalk.dim(`  Artifacts: ${artifactsDir}`));
    } else {
      console.error(chalk.red("Failed:"), failureMessage || "unknown error");
      console.error(
        chalk.dim(
          `  Run ID: ${runId} — artifacts: ${artifactsDir}\n  Details: skill logs --id ${runId}`,
        ),
      );
      process.exit(exitCode || 1);
    }
  }
}
