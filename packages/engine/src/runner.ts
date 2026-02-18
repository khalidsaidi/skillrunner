import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Plan } from './types.js';
import { getRunsDir } from './registry.js';

export interface RunResult {
  runId: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runScript(
  cwd: string,
  scriptPath: string,
  runId?: string
): Promise<RunResult> {
  const rid = runId || randomUUID();
  const runsDir = join(getRunsDir(), rid);
  mkdirSync(runsDir, { recursive: true });

  return new Promise((resolve) => {
    const proc = spawn('bash', [scriptPath], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      const success = exitCode === 0;
      writeFileSync(join(runsDir, 'stdout.log'), stdout);
      writeFileSync(join(runsDir, 'stderr.log'), stderr);
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

export async function executePlan(cwd: string, skillDir: string, plan: Plan): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (const step of plan.steps) {
    if (step.type === 'shell') {
      const parts = step.cmd.split(/\s+/);
      const script = parts[0].startsWith('./') ? join(skillDir, parts[0].slice(2)) : join(skillDir, step.cmd);
      if (existsSync(script)) {
        const r = await runScript(cwd, script, results.length === 0 ? undefined : undefined);
        results.push(r);
        if (!r.success) break;
      }
    }
  }
  return results;
}
