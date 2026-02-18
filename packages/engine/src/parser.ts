import matter from 'gray-matter';
import type { SkillMeta, InputDef } from './types.js';

const REQUIRED_KEYS = ['name', 'description'];

export function parseSkillMd(content: string): SkillMeta {
  const { data, content: body } = matter(content);
  const meta = data as Record<string, unknown>;

  if (!meta || typeof meta !== 'object') {
    throw new Error('SKILL.md must have YAML frontmatter');
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in meta) || typeof meta[key] !== 'string') {
      throw new Error(`SKILL.md frontmatter must have "${key}" (string)`);
    }
  }

  return {
    name: String(meta.name),
    description: String(meta.description),
    version: meta.version != null ? String(meta.version) : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : undefined,
    kind: meta.kind === 'automation' || meta.kind === 'knowledge' ? meta.kind : undefined,
    risk: meta.risk === 'low' || meta.risk === 'moderate' || meta.risk === 'high' ? meta.risk : undefined,
    capabilities: isCapabilities(meta.capabilities) ? meta.capabilities : undefined,
    scripts: isScripts(meta.scripts) ? meta.scripts : undefined,
    inputs: typeof meta.inputs === 'object' && meta.inputs !== null ? (meta.inputs as Record<string, InputDef>) : undefined,
    docs: isDocs(meta.docs) ? meta.docs : undefined,
  };
}

function isCapabilities(v: unknown): v is Record<string, boolean> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isScripts(v: unknown): v is { check?: string; run?: string } {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isDocs(v: unknown): v is { homepage?: string; source?: string } {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
