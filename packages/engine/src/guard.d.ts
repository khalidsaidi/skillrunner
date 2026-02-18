export interface GuardResult {
    passed: boolean;
    violations: string[];
}
export declare function scanScriptForBannedPatterns(scriptPath: string): GuardResult;
export declare function blockMessage(violations: string[]): string;
//# sourceMappingURL=guard.d.ts.map