/**
 * @skillrunner/adapters — optional provider adapter stubs for agent platforms.
 * Extend these to integrate SkillRunner with Cursor, VS Code, or other IDEs.
 */
export * from "./types.js";
export { cursorAdapter } from "./cursor.js";
export { cliAdapter } from "./cli.js";
