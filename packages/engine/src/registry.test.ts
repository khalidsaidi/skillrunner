import { createServer } from "http";
import type { AddressInfo } from "net";
import { describe, it, expect } from "vitest";
import {
  probeRemoteRegistry,
  suggestNames,
  suggestSkillNames,
} from "./registry.js";
import type { RegistryIndex } from "./types.js";

describe("suggestNames", () => {
  const names = [
    "run-lint",
    "run-tests",
    "run-build",
    "terraform-plan-review",
    "anthropic-pdf",
  ];

  it("suggests the close match for a typo", () => {
    expect(suggestNames(names, "run-lnt")[0]).toBe("run-lint");
  });

  it("suggests prefix matches", () => {
    expect(suggestNames(names, "run")).toContain("run-lint");
    expect(suggestNames(names, "run").length).toBeLessThanOrEqual(3);
  });

  it("returns at most three suggestions", () => {
    expect(suggestNames(names, "run-").length).toBeLessThanOrEqual(3);
  });

  it("returns nothing for a wildly different name", () => {
    expect(suggestNames(names, "zzzzqqqq")).toEqual([]);
  });

  it("does not suggest the exact same name", () => {
    expect(suggestNames(names, "run-lint")).not.toContain("run-lint");
  });
});

describe("suggestSkillNames", () => {
  const index = {
    skills: [
      { name: "run-lint", description: "d" },
      { name: "run-tests", description: "d" },
    ],
    packs: [],
  } as unknown as RegistryIndex;

  it("suggests from registry skill names", () => {
    expect(suggestSkillNames(index, "run-lnt")[0]).toBe("run-lint");
  });
});

describe("probeRemoteRegistry", () => {
  it("reports unreachable without a real successful fetch", async () => {
    const result = await probeRemoteRegistry(
      ["http://127.0.0.1:1/index.json"],
      1500,
    );
    expect(result.reachable).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports reachable only after fetching a valid index", async () => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          skills: [{ name: "x", description: "d" }],
          packs: [],
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const result = await probeRemoteRegistry([
        `http://127.0.0.1:${port}/index.json`,
      ]);
      expect(result.reachable).toBe(true);
      expect(result.skills).toBe(1);
      expect(result.url).toContain(`${port}`);
    } finally {
      server.close();
    }
  });

  it("treats a non-registry payload as unreachable", async () => {
    const server = createServer((req, res) => {
      res.end("<html>captive portal</html>");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const result = await probeRemoteRegistry([
        `http://127.0.0.1:${port}/index.json`,
      ]);
      expect(result.reachable).toBe(false);
    } finally {
      server.close();
    }
  });
});
