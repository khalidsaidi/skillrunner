import chalk from "chalk";
import {
  resolveRegistryIndex,
  searchRegistry,
} from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

export async function searchCmd(
  query: string,
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);

  let index;
  try {
    index = await resolveRegistryIndex();
  } catch (e) {
    if (json) {
      console.log(
        JSON.stringify({ error: (e as Error).message, skills: [] }, null, 2),
      );
    } else {
      console.error(chalk.red("Registry unreachable:"), (e as Error).message);
    }
    process.exit(1);
  }

  const hits = searchRegistry(index, query || "");

  if (json) {
    console.log(JSON.stringify({ query: query || "", skills: hits }, null, 2));
    return;
  }

  console.log(chalk.bold(`Search: "${query || ""}"\n`));
  if (hits.length === 0) {
    console.log(`No skills match "${query || ""}".`);
    console.log(
      chalk.dim('Try a broader query, or "skill list" for installed skills.'),
    );
    return;
  }
  for (const s of hits) {
    const risk = s.risk || "low";
    const availability = s.availability || "default";
    console.log(
      `  ${chalk.cyan(s.name)}${chalk.dim(` — risk:${risk} · availability:${availability}`)}`,
    );
    console.log(`    ${s.description}`);
  }
}
