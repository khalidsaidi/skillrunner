#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const SKILLS_DIR = join(REPO_ROOT, 'registry', 'skills');
const PACKS_DIR = join(REPO_ROOT, 'registry', 'packs');
const DIST_DIR = join(REPO_ROOT, 'registry', 'dist');
const BASE_URL = 'https://raw.githubusercontent.com/khalidsaidi/skillrunner/main/registry/skills';

interface SkillMeta {
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  kind?: string;
  risk?: string;
  capabilities?: Record<string, boolean>;
  scripts?: Record<string, string>;
  inputs?: Record<string, unknown>;
}

function buildIndex(): void {
  const skills: Record<string, unknown>[] = [];
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  } else {
    for (const name of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const skillDir = join(SKILLS_DIR, name.name);
      const skillMd = join(skillDir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, 'utf-8');
      const { data } = matter(content);
      const meta = data as SkillMeta;
      if (!meta.name || !meta.description) continue;
      skills.push({
        name: meta.name,
        description: meta.description,
        version: meta.version,
        tags: meta.tags,
        kind: meta.kind,
        risk: meta.risk,
        capabilities: meta.capabilities,
        scripts: meta.scripts,
        inputs: meta.inputs,
        paths: {
          dir: `registry/skills/${name.name}`,
          skill_md: `registry/skills/${name.name}/SKILL.md`,
          raw_skill_md: `${BASE_URL}/${name.name}/SKILL.md`,
        },
      });
    }
  }

  const packs: { name: string; description: string; skills: string[] }[] = [];
  if (existsSync(PACKS_DIR)) {
    for (const f of readdirSync(PACKS_DIR, { withFileTypes: true })) {
      if (f.isFile() && f.name.endsWith('.json')) {
        const p = JSON.parse(readFileSync(join(PACKS_DIR, f.name), 'utf-8'));
        packs.push(p);
      }
    }
  }

  const index = {
    registry_version: 1,
    generated_at: new Date().toISOString(),
    source: {
      repo: 'khalidsaidi/skillrunner',
      ref: 'main',
      base_url: BASE_URL,
    },
    skills,
    packs: packs.length ? packs : [],
  };

  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(join(DIST_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`Built registry: ${skills.length} skills, ${index.packs.length} packs`);
}

buildIndex();
