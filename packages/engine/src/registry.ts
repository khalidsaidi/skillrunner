import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RegistryIndex, RegistrySkill } from './types.js';
import { parseSkillMd } from './parser.js';

const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/khalidsaidi/skillrunner/main/registry/dist/index.json';

const CACHE_DIR = join(process.env.HOME || '', '.skillrunner');
export const REGISTRY_CACHE_DIR = join(CACHE_DIR, 'registry-cache');
export const SKILLS_DIR = join(CACHE_DIR, 'skills');
export const RUNS_DIR = join(CACHE_DIR, 'runs');

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

export function getRunsDir(): string {
  return RUNS_DIR;
}

export async function fetchRemoteRegistry(baseUrl?: string): Promise<RegistryIndex> {
  const url = baseUrl || DEFAULT_REGISTRY_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch registry: ${res.status} ${res.statusText}`);
  return (await res.json()) as RegistryIndex;
}

export function loadLocalRegistry(repoRoot: string): RegistryIndex | null {
  const path = join(repoRoot, 'registry', 'dist', 'index.json');
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as RegistryIndex;
}

export function searchRegistry(index: RegistryIndex, query: string): RegistrySkill[] {
  const q = query.toLowerCase();
  return index.skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
  );
}

export function getSkillFromIndex(index: RegistryIndex, name: string): RegistrySkill | undefined {
  return index.skills.find((s) => s.name === name);
}
