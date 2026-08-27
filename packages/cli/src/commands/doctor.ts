import chalk from "chalk";
import { execSync } from "child_process";
import {
  probeRemoteRegistry,
  resolveRegistryIndexWithSource,
  getSkillsDir,
  getRunsDir,
  type RegistryProbeResult,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

interface RegistryStatus {
  source: "local" | "remote" | "bundled" | null;
  skills: number | null;
  error?: string;
  remote: {
    reachable: boolean;
    url?: string;
    error?: string;
  };
}

function describeRegistrySource(status: RegistryStatus): string {
  if (status.source === "local") {
    return `local repo registry loaded (${status.skills} skills, offline OK)`;
  }
  if (status.source === "bundled") {
    return `bundled registry loaded (${status.skills} skills, offline OK)`;
  }
  if (status.source === "remote") {
    return `remote registry loaded (${status.skills} skills)`;
  }
  return `no registry available${status.error ? ` — ${status.error}` : ""}`;
}

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

  // Which index would commands actually use (local checkout, remote, or the
  // bundled offline copy)?
  const registry: RegistryStatus = {
    source: null,
    skills: null,
    remote: { reachable: false },
  };
  try {
    const resolved = await resolveRegistryIndexWithSource();
    registry.source = resolved.source;
    registry.skills = resolved.index.skills.length;
  } catch (e) {
    registry.error = (e as Error).message;
  }

  // Separately, really probe the network: "reachable" is only ever printed
  // after an actual fetch of the remote index URL succeeded.
  let probe: RegistryProbeResult;
  try {
    probe = await probeRemoteRegistry();
  } catch (e) {
    probe = { reachable: false, errors: [(e as Error).message] };
  }
  registry.remote = {
    reachable: probe.reachable,
    url: probe.url,
    error: probe.reachable ? undefined : probe.errors[probe.errors.length - 1],
  };
  results.registry = registry;

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(chalk.bold("SkillRunner Doctor\n"));
  console.log(
    "Node:    ",
    results.node ? chalk.green(results.node as string) : chalk.red("not found"),
  );
  console.log(
    "pnpm:    ",
    results.pnpm
      ? chalk.green(results.pnpm as string)
      : chalk.yellow("optional"),
  );
  console.log(
    "Git:     ",
    results.git ? chalk.green(results.git as string) : chalk.red("not found"),
  );
  const sourceLine = describeRegistrySource(registry);
  console.log(
    "Registry:",
    registry.source ? chalk.green(sourceLine) : chalk.red(sourceLine),
  );
  console.log(
    "Remote:  ",
    registry.remote.reachable
      ? chalk.green(`reachable (${registry.remote.url})`)
      : chalk.yellow(
          `unreachable${registry.remote.error ? ` — ${registry.remote.error}` : ""}`,
        ),
  );
  console.log("\nPaths:");
  console.log("  skills:", getSkillsDir());
  console.log("  runs: ", getRunsDir());
}
