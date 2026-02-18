import type { Plan } from './types.js';
export interface RunMeta {
    runId: string;
    skillName: string;
    cwd: string;
    startedAt: string;
    finishedAt?: string;
    success?: boolean;
}
export declare function writeRunArtifacts(runId: string, skillName: string, cwd: string, plan: Plan, guardResult: {
    passed: boolean;
    violations: string[];
}, runResult?: {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}): void;
//# sourceMappingURL=artifacts.d.ts.map