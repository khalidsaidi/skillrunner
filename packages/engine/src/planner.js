import { existsSync } from 'fs';
import { join } from 'path';
export function buildPlan(skillDir, meta) {
    const steps = [];
    const requires = {};
    if (meta.capabilities?.shell)
        requires.shell = true;
    if (meta.capabilities?.network)
        requires.network = true;
    if (meta.capabilities?.fs_read)
        requires.fs_read = true;
    if (meta.capabilities?.fs_write)
        requires.fs_write = true;
    const checkPath = meta.scripts?.check ? join(skillDir, meta.scripts.check) : join(skillDir, 'scripts', 'check.sh');
    if (existsSync(checkPath)) {
        steps.push({ type: 'shell', cmd: `./${meta.scripts?.check || 'scripts/check.sh'}` });
    }
    const runPath = meta.scripts?.run ? join(skillDir, meta.scripts.run) : join(skillDir, 'scripts', 'run.sh');
    if (existsSync(runPath)) {
        steps.push({ type: 'shell', cmd: `./${meta.scripts?.run || 'scripts/run.sh'}` });
    }
    return {
        steps,
        requires,
        risk: meta.risk || 'low',
    };
}
//# sourceMappingURL=planner.js.map