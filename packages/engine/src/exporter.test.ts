import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  buildSpecSkillMd,
  exportSkill,
  resolveExportDir,
  resolveExportTarget,
  sanitizeSkillName,
  stripImportSuffix,
} from "./exporter.js";

describe("export target path mapping", () => {
  const home = "/home/test";
  const cwd = "/repo";

  it.each([
    ["claude", "global", "/home/test/.claude/skills"],
    ["claude", "project", "/repo/.claude/skills"],
    ["codex", "global", "/home/test/.agents/skills"],
    ["agents", "global", "/home/test/.agents/skills"],
    ["cursor", "global", "/home/test/.cursor/skills"],
    ["cursor", "project", "/repo/.cursor/skills"],
    ["opencode", "global", "/home/test/.config/opencode/skills"],
    ["opencode", "project", "/repo/.opencode/skills"],
  ] as const)("%s (%s) -> %s", (id, scope, expected) => {
    const target = resolveExportTarget(id);
    expect(target).not.toBeNull();
    expect(resolveExportDir(target!, scope, { home, cwd })).toBe(expected);
  });

  it("rejects unknown targets", () => {
    expect(resolveExportTarget("vscode")).toBeNull();
  });
});

describe("sanitizeSkillName", () => {
  it("lowercases and hyphenates to the spec charset", () => {
    expect(sanitizeSkillName("PDF Processing")).toBe("pdf-processing");
    expect(sanitizeSkillName("--weird__name--")).toBe("weird-name");
    expect(sanitizeSkillName("a".repeat(80))).toHaveLength(64);
  });
});

describe("stripImportSuffix", () => {
  it("removes the import-rename suffix", () => {
    expect(
      stripImportSuffix("Does things. (Imported from anthropic upstream skills)"),
    ).toBe("Does things.");
    expect(stripImportSuffix("No suffix here")).toBe("No suffix here");
  });
});

describe("buildSpecSkillMd", () => {
  const source = `---
name: My_Skill
description: "Does things. (Imported from anthropic upstream skills)"
version: "1.0.0"
kind: automation
risk: low
tags: [a, b]
capabilities:
  shell: true
  network: false
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
license: MIT
---

# Body

Hello.
`;

  it("moves custom fields under metadata and keeps spec fields", () => {
    const { name, content } = buildSpecSkillMd(source);
    expect(name).toBe("my-skill");
    expect(content).toMatch(/^---\nname: my-skill\n/);
    expect(content).toContain("description: Does things.");
    expect(content).not.toContain("Imported from");
    expect(content).toContain("license: MIT");
    // custom fields live under metadata as strings
    expect(content).toMatch(/metadata:\n/);
    expect(content).toMatch(/\n\s+kind: automation\n/);
    expect(content).toMatch(/\n\s+risk: low\n/);
    expect(content).toMatch(/\n\s+capabilities: shell\n/);
    expect(content).toMatch(/\n\s+scripts: check=scripts\/check\.sh, run=scripts\/run\.sh\n/);
    // no top-level custom keys
    expect(content).not.toMatch(/^kind:/m);
    expect(content).not.toMatch(/^risk:/m);
    expect(content).toContain("# Body");
  });
});

describe("exportSkill", () => {
  it("prefers the pristine upstream copy when present", () => {
    const src = mkdtempSync(join(tmpdir(), "sr-export-src-"));
    const dest = mkdtempSync(join(tmpdir(), "sr-export-dest-"));
    writeFileSync(
      join(src, "SKILL.md"),
      `---\nname: prefixed-pdf\ndescription: renamed (Imported from x)\n---\nrewritten`,
    );
    mkdirSync(join(src, "upstream", "scripts"), { recursive: true });
    writeFileSync(
      join(src, "upstream", "SKILL.md"),
      `---\nname: pdf\ndescription: original\n---\noriginal body`,
    );
    writeFileSync(join(src, "upstream", "scripts", "x.py"), "print(1)\n");

    const result = exportSkill(src, dest);
    expect(result.usedUpstream).toBe(true);
    expect(result.name).toBe("pdf");
    const exported = readFileSync(join(dest, "pdf", "SKILL.md"), "utf-8");
    expect(exported).toContain("name: pdf");
    expect(exported).toContain("original body");
    expect(existsSync(join(dest, "pdf", "scripts", "x.py"))).toBe(true);
  });

  it("spec-normalizes native skills and copies files", () => {
    const src = mkdtempSync(join(tmpdir(), "sr-export-src2-"));
    const dest = mkdtempSync(join(tmpdir(), "sr-export-dest2-"));
    writeFileSync(
      join(src, "SKILL.md"),
      `---\nname: native-one\ndescription: native\nkind: knowledge\n---\nbody`,
    );
    mkdirSync(join(src, "scripts"));
    writeFileSync(join(src, "scripts", "run.sh"), "echo hi\n");

    const result = exportSkill(src, dest);
    expect(result.usedUpstream).toBe(false);
    const exported = readFileSync(join(dest, "native-one", "SKILL.md"), "utf-8");
    expect(exported).toContain("kind: knowledge");
    expect(exported).toMatch(/metadata:/);
    expect(existsSync(join(dest, "native-one", "scripts", "run.sh"))).toBe(true);
  });

  it("refuses to overwrite without force", () => {
    const src = mkdtempSync(join(tmpdir(), "sr-export-src3-"));
    const dest = mkdtempSync(join(tmpdir(), "sr-export-dest3-"));
    writeFileSync(
      join(src, "SKILL.md"),
      `---\nname: dup\ndescription: d\n---\nbody`,
    );
    exportSkill(src, dest);
    expect(() => exportSkill(src, dest)).toThrow(/--force/);
    expect(() => exportSkill(src, dest, { force: true })).not.toThrow();
  });
});
