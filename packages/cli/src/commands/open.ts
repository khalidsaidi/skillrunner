import chalk from "chalk";
import { spawn } from "child_process";
import { platform } from "os";
import { shouldUseJson } from "../utils/json.js";

export async function openCmd(
  opts: { json?: boolean },
  cmd: {
    opts?: () => { json?: boolean };
    parent?: { opts?: () => { json?: boolean } };
  },
): Promise<void> {
  const json = shouldUseJson(opts, cmd);
  const url = "http://localhost:5173";

  if (json) {
    console.log(
      JSON.stringify(
        {
          url,
          message: "Start dashboard server with: pnpm --filter dashboard dev",
        },
        null,
        2,
      ),
    );
    return;
  }

  spawn("pnpm", ["--filter", "dashboard", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  const openUrl = () => {
    const cmd =
      platform() === "darwin"
        ? "open"
        : platform() === "win32"
          ? "start"
          : "xdg-open";
    spawn(cmd, [url], { stdio: "ignore", detached: true });
  };

  setTimeout(openUrl, 3000);
  console.log(chalk.green("Dashboard starting at"), url);
}
