import { readFileSync } from "fs";

// Match lines that are NOT comments (avoid blocking shebangs)
const isComment = (line: string) => /^\s*#/.test(line);

const HARD_BLOCK_PATTERNS: RegExp[] = [
  /\bsudo\b/,
  /\bsu\s+/,
  /\brm\s+(-rf|-\s*rf|-r\s*f)\b/,
  /\brm\s+-r\s+-f\b/,
  /\bcurl\s+[^|]+\|\s*(sh|bash)\b/,
  /~\/(\.ssh|\.aws)\b/,
  /\bchmod\s+777\b/,
  /\bchown\s+-R\b/,
];

// Paths that indicate dangerous writes (avoid matching shebangs like #!/usr/bin/env)
const DANGEROUS_PATH_PATTERN = /(^|[^#])\s*\/(etc|usr\/bin|bin)\b/;

export interface GuardResult {
  passed: boolean;
  violations: string[];
}

export function scanScriptForBannedPatterns(scriptPath: string): GuardResult {
  let content: string;
  try {
    content = readFileSync(scriptPath, "utf-8");
  } catch {
    return { passed: true, violations: [] };
  }
  return scanContentForBannedPatterns(content);
}

export function scanContentForBannedPatterns(content: string): GuardResult {
  const violations: string[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isComment(line)) continue;
    for (const pat of HARD_BLOCK_PATTERNS) {
      if (pat.test(line)) {
        violations.push(`Line ${i + 1}: banned pattern: ${line.trim()}`);
      }
    }
    if (DANGEROUS_PATH_PATTERN.test(line)) {
      violations.push(`Line ${i + 1}: writes to system path: ${line.trim()}`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function blockMessage(violations: string[]): string {
  return [
    "Skill blocked by guard. Hard-block patterns detected:",
    ...violations.map((v) => `  - ${v}`),
    "Fix the script and try again.",
  ].join("\n");
}
