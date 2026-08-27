import chalk from "chalk";
import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import {
  auditSkillDir,
  auditSkillsRoot,
  getSkillsDir,
  type SkillAuditResult,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

function findInstalledSkillDir(name: string): string | null {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) return null;
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isDirectory() && (e.name === name || e.name.startsWith(name + "@")),
  );
  return match ? join(skillsDir, match.name) : null;
}

function severityColor(severity: string): (s: string) => string {
  if (severity === "block") return chalk.red;
  if (severity === "warn") return chalk.yellow;
  return chalk.dim;
}

function printResult(result: SkillAuditResult): void {
  const label = result.name || result.dir;
  const blocks = result.findings.filter((f) => f.severity === "block").length;
  const warns = result.findings.filter((f) => f.severity === "warn").length;
  const infos = result.findings.filter((f) => f.severity === "info").length;

  if (result.findings.length === 0) {
    console.log(
      chalk.green("PASS"),
      label,
      chalk.dim(`(${result.scannedFiles.length} file(s) scanned)`),
    );
    return;
  }

  const status = blocks > 0 ? chalk.red("BLOCK") : chalk.yellow("WARN");
  console.log(
    status,
    label,
    chalk.dim(
      `(${blocks} block, ${warns} warn, ${infos} info — ${result.scannedFiles.length} file(s) scanned)`,
    ),
  );
  for (const f of result.findings) {
    const color = severityColor(f.severity);
    console.log(
      `  ${color(f.severity.toUpperCase().padEnd(5))} ${f.file}:${f.line} [${f.ruleId}] ${f.message}`,
    );
    if (f.excerpt) console.log(chalk.dim(`        ${f.excerpt}`));
  }
}

export async function auditCmd(
  target: string | undefined,
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);

  let results: SkillAuditResult[] = [];
  let scannedRoot = "";

  if (!target) {
    // Default: audit everything skillrunner has installed.
    scannedRoot = getSkillsDir();
    results = existsSync(scannedRoot) ? auditSkillsRoot(scannedRoot) : [];
  } else {
    const asPath = resolve(target);
    if (existsSync(asPath) && statSync(asPath).isDirectory()) {
      scannedRoot = asPath;
      results = auditSkillsRoot(asPath);
    } else {
      const installed = findInstalledSkillDir(target);
      if (!installed) {
        const message = `Not a directory and not an installed skill: ${target}`;
        if (json) {
          console.log(
            JSON.stringify({ success: false, error: message }, null, 2),
          );
        } else {
          console.error(chalk.red(message));
        }
        process.exit(1);
      }
      scannedRoot = installed as string;
      results = [auditSkillDir(installed as string)];
    }
  }

  const blocked = results.filter((r) => r.blocked);
  const withWarnings = results.filter(
    (r) => !r.blocked && r.findings.length > 0,
  );

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: blocked.length === 0,
          root: scannedRoot,
          skillsAudited: results.length,
          blocked: blocked.length,
          withWarnings: withWarnings.length,
          results,
        },
        null,
        2,
      ),
    );
  } else {
    if (results.length === 0) {
      console.log(chalk.dim(`No skills found under ${scannedRoot}`));
      return;
    }
    for (const result of results) printResult(result);
    console.log();
    console.log(
      `${results.length} skill(s) audited — ` +
        `${chalk.red(`${blocked.length} blocked`)}, ` +
        `${chalk.yellow(`${withWarnings.length} with warnings`)}, ` +
        `${chalk.green(`${results.length - blocked.length - withWarnings.length} clean`)}`,
    );
    console.log(
      chalk.dim(
        "Static audit: a seatbelt and audit trail, not a sandbox. Review blocked skills before running them anywhere.",
      ),
    );
  }
  if (blocked.length > 0) process.exit(2);
}
