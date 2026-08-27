import { spawn } from "child_process";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Plan } from "./types.js";
import { getRunsDir } from "./registry.js";

export interface RunResult {
  runId: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Convert user-supplied inputs into environment variables for skill
 * scripts: each key becomes INPUT_<NAME> (uppercased, non-alphanumerics
 * mapped to underscores) — the convention scripts read them by.
 */
export function inputsToEnv(
  inputs: Record<string, string>,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputs)) {
    const normalized = key
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
    if (!normalized) continue;
    env[`INPUT_${normalized}`] = value;
  }
  return env;
}

export async function runScript(
  cwd: string,
  scriptPath: string,
  runId?: string,
  extraEnv?: Record<string, string>,
): Promise<RunResult> {
  const rid = runId || randomUUID();
  const runsDir = join(getRunsDir(), rid);
  mkdirSync(runsDir, { recursive: true });

  return new Promise((resolve) => {
    const proc = spawn("bash", [scriptPath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env:
        extraEnv && Object.keys(extraEnv).length > 0
          ? { ...process.env, ...extraEnv }
          : process.env,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      const success = exitCode === 0;
      writeFileSync(join(runsDir, "stdout.log"), stdout);
      writeFileSync(join(runsDir, "stderr.log"), stderr);
      resolve({
        runId: rid,
        success,
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}

export async function executePlan(
  cwd: string,
  skillDir: string,
  plan: Plan,
  opts: { inputs?: Record<string, string> } = {},
): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const extraEnv = opts.inputs ? inputsToEnv(opts.inputs) : undefined;
  for (const step of plan.steps) {
    if (step.type === "shell") {
      const parts = step.cmd.split(/\s+/);
      const script = parts[0].startsWith("./")
        ? join(skillDir, parts[0].slice(2))
        : join(skillDir, step.cmd);
      if (existsSync(script)) {
        const r = await runScript(cwd, script, undefined, extraEnv);
        results.push(r);
        if (!r.success) break;
      }
    }
  }
  return results;
}
