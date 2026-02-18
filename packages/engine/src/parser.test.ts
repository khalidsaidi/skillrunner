import { describe, it, expect } from "vitest";
import { parseSkillMd } from "./parser.js";

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
