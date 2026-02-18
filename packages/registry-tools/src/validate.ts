#!/usr/bin/env node

import { readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const SKILLS_DIR = join(REPO_ROOT, 'registry', 'skills');

let failed = 0;

function validate(): void {
  if (!existsSync(SKILLS_DIR)) {
    console.log('registry/skills/ not found');
    process.exit(1);
  }

  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(SKILLS_DIR, entry.name);
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      console.error(`Missing SKILL.md: ${entry.name}`);
      failed++;
      continue;
    }

    const scriptsDir = join(skillDir, 'scripts');
    if (existsSync(scriptsDir)) {
      const checkSh = join(scriptsDir, 'check.sh');
      const runSh = join(scriptsDir, 'run.sh');
      if (existsSync(runSh)) {
        const st = statSync(runSh);
        if ((st.mode & 0o111) === 0) {
          console.error(`${entry.name}: scripts/run.sh not executable`);
          failed++;
        }
      }
      if (existsSync(checkSh)) {
        const st = statSync(checkSh);
        if ((st.mode & 0o111) === 0) {
          console.error(`${entry.name}: scripts/check.sh not executable`);
          failed++;
        }
      }
    }
  }

  if (failed) {
    console.error(`Validation failed: ${failed} error(s)`);
    process.exit(1);
  }
  console.log('Registry validation passed');
}

validate();
