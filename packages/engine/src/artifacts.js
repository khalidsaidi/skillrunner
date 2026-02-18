import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getRunsDir } from './registry.js';
export function writeRunArtifacts(runId, skillName, cwd, plan, guardResult, runResult) {
    const runsDir = join(getRunsDir(), runId);
    mkdirSync(runsDir, { recursive: true });
    const meta = {
        runId,
        skillName,
        cwd,
        startedAt: new Date().toISOString(),
    };
    if (runResult) {
        meta.finishedAt = new Date().toISOString();
        meta.success = runResult.success;
    }
    writeFileSync(join(runsDir, 'meta.json'), JSON.stringify(meta, null, 2));
    writeFileSync(join(runsDir, 'plan.json'), JSON.stringify(plan, null, 2));
    writeFileSync(join(runsDir, 'guard.json'), JSON.stringify(guardResult, null, 2));
    if (runResult) {
        writeFileSync(join(runsDir, 'stdout.log'), runResult.stdout);
        writeFileSync(join(runsDir, 'stderr.log'), runResult.stderr);
        writeFileSync(join(runsDir, 'summary.json'), JSON.stringify({
            success: runResult.success,
            exitCode: runResult.exitCode,
        }, null, 2));
    }
}
//# sourceMappingURL=artifacts.js.map