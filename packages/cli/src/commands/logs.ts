import chalk from "chalk";
import {
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
} from "fs";
import { join } from "path";
import { getRunsDir } from "@skillrunner/engine";

function getRunIdsByRecent(runsDir: string): string[] {
  const entries = readdirSync(runsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      mtime: statSync(join(runsDir, e.name)).mtimeMs,
    }));
  return entries.sort((a, b) => b.mtime - a.mtime).map((e) => e.name);
}

export async function logsCmd(
  opts: { last?: boolean; id?: string },
  cmd?: { opts: () => { json?: boolean } },
): Promise<void> {
  const json = !!cmd?.opts?.()?.json;
  const runsDir = getRunsDir();

  if (!existsSync(runsDir)) {
    if (json) console.log(JSON.stringify({ runs: [] }, null, 2));
    else console.log(chalk.dim("No runs yet."));
    return;
  }

  const ids = getRunIdsByRecent(runsDir);

  let targetId = opts.id;
  if (opts.last && ids.length) targetId = ids[0];
  if (!targetId) {
    const runs = ids.slice(0, 20).map((id) => {
      try {
        const metaPath = join(runsDir, id, "meta.json");
        if (!existsSync(metaPath)) return { id };
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        return { id, ...meta };
      } catch {
        return { id };
      }
    });
    if (json) {
      console.log(JSON.stringify({ runs }, null, 2));
    } else {
      console.log(chalk.bold("Recent runs:\n"));
      for (const r of runs) {
        console.log(`  ${r.id}  ${r.skillName || "?"}  ${r.startedAt || ""}`);
      }
    }
    return;
  }

  const runPath = join(runsDir, targetId);
  if (!existsSync(runPath)) {
    if (json) console.log(JSON.stringify({ error: "Run not found" }, null, 2));
    else console.error(chalk.red("Run not found:"), targetId);
    process.exit(1);
  }

  const metaPath = join(runPath, "meta.json");
  const stdoutPath = join(runPath, "stdout.log");
  const stderrPath = join(runPath, "stderr.log");

  const meta = existsSync(metaPath)
    ? JSON.parse(readFileSync(metaPath, "utf-8"))
    : {};
  const stdout = existsSync(stdoutPath)
    ? readFileSync(stdoutPath, "utf-8")
    : "";
  const stderr = existsSync(stderrPath)
    ? readFileSync(stderrPath, "utf-8")
    : "";

  if (json) {
    console.log(JSON.stringify({ ...meta, stdout, stderr }, null, 2));
    return;
  }

  console.log(chalk.bold(`Run ${targetId}\n`));
  console.log("Skill:", meta.skillName ?? "(unknown)");
  console.log("CWD: ", meta.cwd ?? "(unknown)");
  console.log("Started:", meta.startedAt ?? "(unknown)");
  console.log("Success:", meta.success ?? "(unknown)");
  if (stdout) {
    console.log(chalk.bold("\n--- stdout ---"));
    console.log(stdout);
  }
  if (stderr) {
    console.log(chalk.bold("\n--- stderr ---"));
    console.log(chalk.red(stderr));
  }
}
