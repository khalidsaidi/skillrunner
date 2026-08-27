/**
 * SKILL.md consumer adapters.
 *
 * The original cursor-only stub is generalized into one adapter per
 * SKILL.md-consuming agent product. Each adapter resolves skills from the
 * directories that product actually reads; invocation stays with the agent
 * itself — SkillRunner's job is to audit and export into these directories
 * (see `skill export`).
 */
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ProviderAdapter, SkillContext, RunResult } from "./types.js";

interface TargetDirs {
  providerId: string;
  globalDir: string[];
  projectDir: string[];
}

const TARGETS: TargetDirs[] = [
  {
    providerId: "claude",
    globalDir: [".claude", "skills"],
    projectDir: [".claude", "skills"],
  },
  {
    providerId: "codex",
    globalDir: [".agents", "skills"],
    projectDir: [".agents", "skills"],
  },
  {
    providerId: "cursor",
    globalDir: [".cursor", "skills"],
    projectDir: [".cursor", "skills"],
  },
  {
    providerId: "opencode",
    globalDir: [".config", "opencode", "skills"],
    projectDir: [".opencode", "skills"],
  },
];

function readDescription(skillMdPath: string): string {
  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const match = /^description:\s*["']?(.+?)["']?\s*$/m.exec(content);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

function makeAdapter(target: TargetDirs): ProviderAdapter {
  return {
    providerId: target.providerId,

    async resolveSkill(name: string): Promise<SkillContext | null> {
      const roots = [
        join(process.cwd(), ...target.projectDir),
        join(homedir(), ...target.globalDir),
      ];
      for (const root of roots) {
        const skillMd = join(root, name, "SKILL.md");
        if (existsSync(skillMd)) {
          return {
            name,
            description: readDescription(skillMd),
            path: join(root, name),
          };
        }
      }
      return null;
    },

    async invokeSkill(
      name: string,
      _inputs?: Record<string, string>,
    ): Promise<RunResult> {
      throw new Error(
        `Skills exported to ${target.providerId} are invoked by the agent itself. ` +
          `Use \`skill run ${name}\` for skillrunner-native execution, or ` +
          `\`skill export ${target.providerId} ${name}\` to (re)export it.`,
      );
    },
  };
}

export const claudeAdapter: ProviderAdapter = makeAdapter(TARGETS[0]);
export const codexAdapter: ProviderAdapter = makeAdapter(TARGETS[1]);
export const cursorAdapter: ProviderAdapter = makeAdapter(TARGETS[2]);
export const opencodeAdapter: ProviderAdapter = makeAdapter(TARGETS[3]);

export const targetAdapters: ProviderAdapter[] = [
  claudeAdapter,
  codexAdapter,
  cursorAdapter,
  opencodeAdapter,
];
