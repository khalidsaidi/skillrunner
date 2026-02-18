import chalk from "chalk";
import { spawn } from "child_process";
import { platform } from "os";

export async function openCmd(this: {
  opts: () => { json?: boolean };
}): Promise<void> {
  const json = !!this.opts().json;
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
