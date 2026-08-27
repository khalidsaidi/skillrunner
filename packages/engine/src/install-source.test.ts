import { describe, it, expect } from "vitest";
import { parseInstallSource } from "./install-source.js";

describe("parseInstallSource", () => {
  it("treats plain names as registry skills", () => {
    expect(parseInstallSource("terraform-plan-review")).toEqual({
      type: "registry",
      name: "terraform-plan-review",
    });
  });

  it("parses owner/repo", () => {
    expect(parseInstallSource("anthropics/skills")).toEqual({
      type: "github",
      owner: "anthropics",
      repo: "skills",
      path: "",
    });
  });

  it("parses owner/repo/deep/path", () => {
    expect(parseInstallSource("anthropics/skills/skills/pdf")).toEqual({
      type: "github",
      owner: "anthropics",
      repo: "skills",
      path: "skills/pdf",
    });
  });

  it("strips a trailing SKILL.md from the path", () => {
    expect(
      parseInstallSource("anthropics/skills/skills/pdf/SKILL.md"),
    ).toMatchObject({ type: "github", path: "skills/pdf" });
  });

  it("parses github.com tree URLs with ref", () => {
    expect(
      parseInstallSource(
        "https://github.com/anthropics/skills/tree/main/skills/pdf",
      ),
    ).toEqual({
      type: "github",
      owner: "anthropics",
      repo: "skills",
      ref: "main",
      path: "skills/pdf",
    });
  });

  it("parses github.com blob URLs to SKILL.md", () => {
    expect(
      parseInstallSource(
        "https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md",
      ),
    ).toMatchObject({
      type: "github",
      owner: "anthropics",
      repo: "skills",
      ref: "main",
      path: "skills/pdf",
    });
  });

  it("parses bare github.com repo URLs", () => {
    expect(parseInstallSource("https://github.com/foo/bar")).toMatchObject({
      type: "github",
      owner: "foo",
      repo: "bar",
      path: "",
    });
  });

  it("parses raw.githubusercontent.com URLs", () => {
    expect(
      parseInstallSource(
        "https://raw.githubusercontent.com/anthropics/skills/main/skills/pdf/SKILL.md",
      ),
    ).toMatchObject({
      type: "github",
      owner: "anthropics",
      repo: "skills",
      ref: "main",
      path: "skills/pdf",
    });
  });

  it("keeps non-GitHub URLs as plain URLs", () => {
    expect(parseInstallSource("https://example.com/my-skill/SKILL.md")).toEqual(
      {
        type: "url",
        url: "https://example.com/my-skill/SKILL.md",
      },
    );
  });
});
