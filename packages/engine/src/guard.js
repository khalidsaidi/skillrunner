import { readFileSync } from 'fs';
const HARD_BLOCK_PATTERNS = [
    /\bsudo\b/,
    /\bsu\s/,
    /\brm\s+(-rf|-\s*rf|-r\s*f)\b/,
    /\brm\s+-r\s+-f\b/,
    /\bcurl\s+[^|]+\|\s*(sh|bash)\b/,
    /~\/(\.ssh|\.aws)\b/,
    /\/(etc|usr\/bin|bin)\b/,
    /\bchmod\s+777\b/,
    /\bchown\s+-R\b/,
];
export function scanScriptForBannedPatterns(scriptPath) {
    const violations = [];
    let content;
    try {
        content = readFileSync(scriptPath, 'utf-8');
    }
    catch {
        return { passed: true, violations: [] };
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pat of HARD_BLOCK_PATTERNS) {
            if (pat.test(line)) {
                violations.push(`Line ${i + 1}: banned pattern: ${line.trim()}`);
            }
        }
    }
    return {
        passed: violations.length === 0,
        violations,
    };
}
export function blockMessage(violations) {
    return [
        'Skill blocked by guard. Hard-block patterns detected:',
        ...violations.map((v) => `  - ${v}`),
        'Fix the script and try again.',
    ].join('\n');
}
//# sourceMappingURL=guard.js.map