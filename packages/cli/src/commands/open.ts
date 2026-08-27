import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";
import { resolveRegistryRoot } from "@khalidsaidi/skillrunner-engine";
import { shouldUseJson } from "../utils/json.js";

const REPO_URL = "https://github.com/khalidsaidi/skillrunner";

function findDashboardRoot(): string | null {
  const root = resolveRegistryRoot();
  if (!root) return null;
  const dashboardDir = join(root, "packages", "dashboard");
  if (existsSync(join(dashboardDir, "server.mjs"))) return root;
  return null;
}

export async function openCmd(
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const url = "http://localhost:5173";
  const repoRoot = findDashboardRoot();

  if (!repoRoot) {
    // npm installs ship only the CLI — the dashboard lives in the repo.
    const message =
      "The dashboard is not bundled with the npm CLI. " +
      `Clone ${REPO_URL} and run: pnpm install && pnpm --filter @skillrunner/dashboard dev`;
    if (json) {
      console.log(
        JSON.stringify({ success: false, available: false, message }, null, 2),
      );
    } else {
      console.log(chalk.yellow("No dashboard here."), message);
      console.log(
        chalk.dim(
          "In the meantime: skill list, skill logs --last, and skill audit cover the same ground from the terminal.",
        ),
      );
    }
    return;
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          url,
          message:
            "Start with: pnpm --filter @skillrunner/dashboard dev (from the repo root)",
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(chalk.green("Starting dashboard from"), repoRoot);
  spawn("pnpm", ["--filter", "@skillrunner/dashboard", "dev"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  const openUrl = () => {
    const opener =
      platform() === "darwin"
        ? "open"
        : platform() === "win32"
          ? "start"
          : "xdg-open";
    spawn(opener, [url], { stdio: "ignore", detached: true });
  };
  setTimeout(openUrl, 3000);
  console.log(chalk.green("Dashboard starting at"), url);
}
