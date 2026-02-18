import chalk from 'chalk';
import { rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getSkillsDir } from '@skillrunner/engine';

export async function uninstallCmd(
  name: string,
  _opts: unknown,
  cmd: { opts: () => { json?: boolean } }
): Promise<void> {
  const json = !!cmd.opts().json;
  const skillsDir = getSkillsDir();

  if (!existsSync(skillsDir)) {
    if (json) console.log(JSON.stringify({ success: false, error: 'No skills installed' }, null, 2));
    else console.log(chalk.dim('No skills installed.'));
    return;
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const match = entries.find((e) => e.isDirectory() && (e.name === name || e.name.startsWith(name + '@')));
  if (!match) {
    if (json) {
      console.log(JSON.stringify({ success: false, error: `Skill not found: ${name}` }, null, 2));
    } else {
      console.error(chalk.red('Skill not found:'), name);
    }
    process.exit(1);
  }

  rmSync(join(skillsDir, match.name), { recursive: true });
  if (json) {
    console.log(JSON.stringify({ success: true }, null, 2));
  } else {
    console.log(chalk.green('Uninstalled:'), match.name);
  }
}
