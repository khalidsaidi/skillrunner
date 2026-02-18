import chalk from "chalk";
import {
  fetchRemoteRegistry,
  loadLocalRegistry,
  getSkillFromIndex,
  parseSkillMd,
  getSkillsDir,
  findRegistryRoot,
} from "@skillrunner/engine";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export async function infoCmd(
  name: string,
  _opts: unknown,
  cmd: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd.opts().json;
  const repoRoot = findRegistryRoot();
  const index = repoRoot ? loadLocalRegistry(repoRoot) : null;
  const idx = index ?? (await fetchRemoteRegistry());
  let skill = getSkillFromIndex(idx, name);

  if (!skill) {
    const localPath = join(getSkillsDir(), name);
    if (existsSync(join(localPath, "SKILL.md"))) {
      const meta = parseSkillMd(
        readFileSync(join(localPath, "SKILL.md"), "utf-8"),
      );
      skill = {
        name: meta.name,
        description: meta.description,
        version: meta.version,
        tags: meta.tags,
        kind: meta.kind,
        risk: meta.risk,
        capabilities: meta.capabilities,
        scripts: meta.scripts,
        inputs: meta.inputs,
        paths: {
          dir: localPath,
          skill_md: join(localPath, "SKILL.md"),
          raw_skill_md: "",
        },
      };
    }
  }

  if (!skill) {
    if (json)
      console.log(JSON.stringify({ error: "Skill not found" }, null, 2));
    else console.error(chalk.red("Skill not found:"), name);
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  console.log(chalk.bold(skill.name));
  if (skill.version) console.log(chalk.dim(`Version: ${skill.version}`));
  console.log(chalk.dim(`Kind: ${skill.kind || "unknown"}`));
  console.log(chalk.dim(`Risk: ${skill.risk || "low"}`));
  console.log();
  console.log(skill.description);
  if (skill.tags?.length)
    console.log(chalk.dim("\nTags: " + skill.tags.join(", ")));
}
