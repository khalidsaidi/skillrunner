import chalk from 'chalk';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import {
  fetchRemoteRegistry,
  loadLocalRegistry,
  getSkillFromIndex,
  getSkillsDir,
  REGISTRY_CACHE_DIR,
  findRegistryRoot,
} from '@skillrunner/engine';

function ensureRegistryCache(): string {
  mkdirSync(REGISTRY_CACHE_DIR, { recursive: true });
  const repoPath = join(REGISTRY_CACHE_DIR, 'skillrunner');
  if (!existsSync(join(repoPath, '.git'))) {
    execSync(
      `git clone --depth 1 https://github.com/khalidsaidi/skillrunner.git "${repoPath}"`,
      { stdio: 'inherit' }
    );
  } else {
    try {
      execSync('git pull', { cwd: repoPath, stdio: 'pipe' });
    } catch {
      // ignore pull failures
    }
  }
  return repoPath;
}

export async function installCmd(
  name: string,
  _opts: unknown,
  cmd: { opts: () => { json?: boolean } }
): Promise<void> {
  const json = !!cmd.opts().json;

  let index;
  try {
    const repoRoot = findRegistryRoot();
    index = repoRoot ? loadLocalRegistry(repoRoot) : null;
    index = index ?? (await fetchRemoteRegistry());
  } catch (e) {
    if (json) {
      console.log(JSON.stringify({ success: false, error: (e as Error).message }, null, 2));
    } else {
      console.error(chalk.red('Registry unreachable:'), (e as Error).message);
    }
    process.exit(1);
  }

  const skill = getSkillFromIndex(index, name);
  if (!skill) {
    if (json) {
      console.log(JSON.stringify({ success: false, error: `Skill not found: ${name}` }, null, 2));
    } else {
      console.error(chalk.red('Skill not found:'), name);
    }
    process.exit(1);
  }

  const skillsDir = getSkillsDir();
  mkdirSync(skillsDir, { recursive: true });
  const destDir = join(skillsDir, `${skill.name}@${skill.version || 'latest'}`);

  let sourceDir: string;
  const repoRoot = findRegistryRoot();
  if (repoRoot) {
    sourceDir = join(repoRoot, 'registry', 'skills', skill.name);
  } else {
    const cacheRoot = ensureRegistryCache();
    sourceDir = join(cacheRoot, 'registry', 'skills', skill.name);
  }

  if (!existsSync(sourceDir)) {
    if (json) {
      console.log(JSON.stringify({ success: false, error: `Skill dir not found: ${skill.name}` }, null, 2));
    } else {
      console.error(chalk.red('Skill directory not found in registry:'), skill.name);
    }
    process.exit(1);
  }

  cpSync(sourceDir, destDir, { recursive: true });

  if (json) {
    console.log(JSON.stringify({ success: true, path: destDir }, null, 2));
  } else {
    console.log(chalk.green('Installed:'), skill.name, chalk.dim(`→ ${destDir}`));
  }
}
