import type { Plan } from './types.js';
export interface RunResult {
    runId: string;
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
}
export declare function runScript(cwd: string, scriptPath: string, runId?: string): Promise<RunResult>;
export declare function executePlan(cwd: string, skillDir: string, plan: Plan): Promise<RunResult[]>;
//# sourceMappingURL=runner.d.ts.map