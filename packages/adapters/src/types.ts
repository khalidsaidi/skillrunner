/**
 * Provider adapter types for optional agent platform integration.
 * Stubs for future Cursor, VS Code, or other IDE extensions.
 */

export interface SkillContext {
  name: string;
  description: string;
  path: string;
}

export interface RunResult {
  runId: string;
  success: boolean;
  exitCode: number;
}

export interface ProviderAdapter {
  /** Resolve a skill by name; returns null if not available in this provider. */
  resolveSkill(name: string): Promise<SkillContext | null>;

  /** Invoke a skill; stubs may throw or return placeholder. */
  invokeSkill(
    name: string,
    inputs?: Record<string, string>,
  ): Promise<RunResult>;

  /** Provider identifier (e.g. 'cursor', 'cli'). */
  readonly providerId: string;
}
