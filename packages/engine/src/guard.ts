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

// Paths that indicate dangerous writes to system locations.
// Require path-like context: the path must be preceded by start-of-line,
// whitespace, or a shell delimiter (= ' " ` ( : > | ; &) AND be followed by a
// real path segment. This keeps prose like "Python/Bash/etc." and embedded
// shebangs ('''#!/usr/bin/env python3) from matching, while still catching
// real targets like /etc/passwd, /usr/bin/foo, /bin/sh.
const DANGEROUS_PATH_PATTERN =
  /(^|[\s='"`(:>|;&])\/(etc|usr\/bin|bin)\/[A-Za-z0-9._-]/;

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
  const seen = new Set<string>();
  const push = (violation: string) => {
    // One report per identical offense — several patterns matching the same
    // line should not produce duplicate findings.
    if (seen.has(violation)) return;
    seen.add(violation);
    violations.push(violation);
  };
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isComment(line)) continue;
    for (const pat of HARD_BLOCK_PATTERNS) {
      if (pat.test(line)) {
        push(`Line ${i + 1}: banned pattern: ${line.trim()}`);
      }
    }
    if (DANGEROUS_PATH_PATTERN.test(line)) {
      push(`Line ${i + 1}: writes to system path: ${line.trim()}`);
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
