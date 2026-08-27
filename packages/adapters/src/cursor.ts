/**
 * Cursor adapter stub.
 * Future: integrate with Cursor's skill API to resolve and invoke skills in-context.
 */
import type { ProviderAdapter, SkillContext, RunResult } from "./types.js";

export const cursorAdapter: ProviderAdapter = {
  providerId: "cursor",

  async resolveSkill(_name: string): Promise<SkillContext | null> {
    // Stub: always returns null; real impl would check ~/.cursor/skills/
    return null;
  },

  async invokeSkill(
    _name: string,
    _inputs?: Record<string, string>,
  ): Promise<RunResult> {
    throw new Error(
      "Cursor adapter is a stub. Use `skill run <name>` from the CLI to execute skills.",
    );
  },
};
