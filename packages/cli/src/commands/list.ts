import chalk from 'chalk';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseSkillMd } from '@skillrunner/engine';
import { getSkillsDir } from '@skillrunner/engine';

export async function listCmd(this: { opts: () => { json?: boolean } }): Promise<void> {
  const json = !!this.opts().json;
  const skillsDir = getSkillsDir();

  const skills: { name: string; version?: string; description?: string }[] = [];
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillMd = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillMd)) {
          try {
            const meta = parseSkillMd(readFileSync(skillMd, 'utf-8'));
            skills.push({
              name: meta.name,
              version: meta.version,
              description: meta.description,
            });
          } catch {
            skills.push({ name: entry.name, version: undefined, description: undefined });
          }
        }
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ skills }, null, 2));
    return;
  }

  console.log(chalk.bold('Installed skills:\n'));
  if (skills.length === 0) {
    console.log(chalk.dim('  (none) — use "skill install <name>" to install'));
    return;
  }
  for (const s of skills) {
    console.log(`  ${chalk.cyan(s.name)}${s.version ? chalk.dim(`@${s.version}`) : ''}`);
    if (s.description) console.log(`    ${chalk.dim(s.description)}`);
  }
}
