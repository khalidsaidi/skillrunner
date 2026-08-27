import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  findSkillContractFile,
  loadSkillMetaFromDir,
  parseSkillContract,
  parseSkillMd,
} from "./parser.js";

describe("parseSkillMd", () => {
  it("parses valid SKILL.md frontmatter", () => {
    const content = `---
name: foo
description: A test skill
---
# Foo`;
    const meta = parseSkillMd(content);
    expect(meta.name).toBe("foo");
    expect(meta.description).toBe("A test skill");
  });

  it("throws when name or description is missing", () => {
    expect(() => parseSkillMd("---\nname: x\n---")).toThrow(/description/);
    expect(() => parseSkillMd("---\ndescription: x\n---")).toThrow(/name/);
  });
});

describe("parseSkillContract", () => {
  it("parses YAML contract files", () => {
    const content = `
name: yaml-skill
description: YAML contract
scripts:
  run: scripts/run.sh
availability: advanced
prerequisites:
  tools: [node, pnpm]
`;
    const meta = parseSkillContract(content, {
      sourcePath: "skill.yaml",
    });
    expect(meta.name).toBe("yaml-skill");
    expect(meta.availability).toBe("advanced");
    expect(meta.scripts?.run).toBe("scripts/run.sh");
    expect(meta.prerequisites?.tools).toEqual(["node", "pnpm"]);
  });

  it("parses instruction markdown contracts without frontmatter", () => {
    const content = `
# Agent Installer

Install skills from remote repositories and update local skill cache.

## Steps
- Parse index
- Download contract
`;
    const meta = parseSkillContract(content, {
      sourcePath: "AGENT.md",
      fallbackName: "agent-installer",
    });
    expect(meta.name).toBe("agent-installer");
    expect(meta.description).toMatch(
      /Install skills from remote repositories/i,
    );
  });
});

describe("contract discovery", () => {
  it("prefers SKILL.md over fallback contracts", () => {
    const dir = mkdtempSync(join(tmpdir(), "skillrunner-engine-test-"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      `---\nname: explicit-skill\ndescription: explicit\n---`,
    );
    writeFileSync(join(dir, "README.md"), "# Fallback");

    const contract = findSkillContractFile(dir);
    expect(contract?.file).toBe("SKILL.md");
    expect(contract?.type).toBe("skill_md");
  });

  it("loads metadata from non-SKILL contracts", () => {
    const dir = mkdtempSync(join(tmpdir(), "skillrunner-engine-test-"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "skill.json"),
      JSON.stringify({
        name: "json-skill",
        description: "JSON contract",
        scripts: { run: "scripts/run.sh" },
      }),
    );

    const loaded = loadSkillMetaFromDir(dir);
    expect(loaded.contract.file).toBe("skill.json");
    expect(loaded.meta.name).toBe("json-skill");
    expect(loaded.meta.scripts?.run).toBe("scripts/run.sh");
  });
});
