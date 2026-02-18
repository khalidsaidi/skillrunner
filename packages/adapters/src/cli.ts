/**
 * CLI adapter stub.
 * Future: thin wrapper over @skillrunner/engine for programmatic invocation.
 */
import type { ProviderAdapter, SkillContext, RunResult } from "./types.js";

export const cliAdapter: ProviderAdapter = {
  providerId: "cli",

  async resolveSkill(name: string): Promise<SkillContext | null> {
    // Stub: returns placeholder; real impl would use findSkillDir + parseSkillMd
    return {
      name,
      description: "(stub)",
      path: "",
    };
  },

  async invokeSkill(
    _name: string,
    _inputs?: Record<string, string>,
  ): Promise<RunResult> {
    throw new Error(
      "CLI adapter is a stub. Use `skill run <name>` from the CLI to execute skills.",
    );
  },
};
