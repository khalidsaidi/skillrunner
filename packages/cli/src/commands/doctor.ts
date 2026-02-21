import chalk from "chalk";
import { execSync } from "child_process";
import {
  resolveRegistryIndex,
  getSkillsDir,
  getRunsDir,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

export async function doctorCmd(
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);

  const results: Record<string, unknown> = {
    node: null as string | null,
    pnpm: null as string | null,
    git: null as string | null,
    registry: null as string | null,
    paths: { skills: getSkillsDir(), runs: getRunsDir() },
  };

  try {
    results.node = execSync("node -v", { encoding: "utf-8" }).trim();
  } catch {
    results.node = null;
  }
  try {
    results.pnpm = execSync("pnpm -v 2>/dev/null || npm -v 2>/dev/null", {
      encoding: "utf-8",
      shell: "/bin/bash",
    }).trim();
  } catch {
    results.pnpm = null;
  }
  try {
    results.git = execSync("git --version", { encoding: "utf-8" }).trim();
  } catch {
    results.git = null;
  }

  try {
    const index = await resolveRegistryIndex();
    results.registry = index ? "ok" : null;
  } catch (e) {
    results.registry = (e as Error).message;
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(chalk.bold("SkillRunner Doctor\n"));
  console.log(
    "Node:   ",
    results.node ? chalk.green(results.node as string) : chalk.red("not found"),
  );
  console.log(
    "pnpm:   ",
    results.pnpm
      ? chalk.green(results.pnpm as string)
      : chalk.yellow("optional"),
  );
  console.log(
    "Git:    ",
    results.git ? chalk.green(results.git as string) : chalk.red("not found"),
  );
  console.log(
    "Registry:",
    results.registry === "ok"
      ? chalk.green("reachable")
      : chalk.red(String(results.registry)),
  );
  console.log("\nPaths:");
  console.log("  skills:", getSkillsDir());
  console.log("  runs: ", getRunsDir());
}
