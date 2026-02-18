import { existsSync } from 'fs';
import { join } from 'path';

export function findRegistryRoot(startCwd = process.cwd()): string {
  let d = startCwd;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(d, 'registry', 'skills'))) return d;
    const parent = join(d, '..');
    if (parent === d) break;
    d = parent;
  }
  return '';
}
