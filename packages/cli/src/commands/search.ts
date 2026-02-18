import chalk from "chalk";
import {
  fetchRemoteRegistry,
  loadLocalRegistry,
  searchRegistry,
  findRegistryRoot,
} from "@skillrunner/engine";

export async function searchCmd(
  query: string,
  _opts: unknown,
  cmd: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd.opts().json;

  let index;
  try {
    const repoRoot = findRegistryRoot();
    index = repoRoot ? loadLocalRegistry(repoRoot) : null;
    index = index ?? (await fetchRemoteRegistry());
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
  for (const s of hits) {
    const risk = s.risk ? chalk.dim(` [${s.risk}]`) : "";
    console.log(`  ${chalk.cyan(s.name)}${risk}`);
    console.log(`    ${s.description}`);
  }
}
