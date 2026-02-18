import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Plan } from "./types.js";
import { getRunsDir } from "./registry.js";

export interface RunMeta {
  runId: string;
  skillName: string;
  cwd: string;
  startedAt: string;
  finishedAt?: string;
  success?: boolean;
}

export function writeRunArtifacts(
  runId: string,
  skillName: string,
  cwd: string,
  plan: Plan,
  guardResult: { passed: boolean; violations: string[] },
  runResult?: {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  },
): void {
  const runsDir = join(getRunsDir(), runId);
  mkdirSync(runsDir, { recursive: true });

  const meta: RunMeta = {
    runId,
    skillName,
    cwd,
    startedAt: new Date().toISOString(),
  };
  if (runResult) {
    meta.finishedAt = new Date().toISOString();
    meta.success = runResult.success;
  }

  writeFileSync(join(runsDir, "meta.json"), JSON.stringify(meta, null, 2));
  writeFileSync(join(runsDir, "plan.json"), JSON.stringify(plan, null, 2));
  writeFileSync(
    join(runsDir, "guard.json"),
    JSON.stringify(guardResult, null, 2),
  );

  if (runResult) {
    writeFileSync(join(runsDir, "stdout.log"), runResult.stdout);
    writeFileSync(join(runsDir, "stderr.log"), runResult.stderr);
    writeFileSync(
      join(runsDir, "summary.json"),
      JSON.stringify(
        {
          success: runResult.success,
          exitCode: runResult.exitCode,
        },
        null,
        2,
      ),
    );
  }
}
