import { existsSync, readdirSync } from "fs";
import {
  getRegistrySkillSlug,
  getSkillsDir,
  resolveRegistryIndex,
  suggestNames,
  type RegistryIndex,
} from "@khalidsaidi/skillrunner-engine";

/** Names of locally installed skills (version suffix stripped). */
export function installedSkillNames(): string[] {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) return [];
  try {
    return readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name.split("@")[0]);
  } catch {
    return [];
  }
}

function registryCandidates(index: RegistryIndex): string[] {
  const out: string[] = [];
  for (const s of index.skills) {
    out.push(s.name);
    const slug = getRegistrySkillSlug(s);
    if (slug && slug !== s.name) out.push(slug);
  }
  return out;
}

/**
 * Best-effort near-match suggestions for a mistyped skill name, drawn from
 * the given extra candidates (e.g. installed skills) plus the registry.
 * Never throws — an unreachable registry just means fewer candidates.
 */
export async function suggestForName(
  input: string,
  opts: { index?: RegistryIndex; extraCandidates?: string[] } = {},
): Promise<string[]> {
  const candidates = [...(opts.extraCandidates || [])];
  let index = opts.index;
  if (!index) {
    try {
      index = await resolveRegistryIndex();
    } catch {
      index = undefined;
    }
  }
  if (index) candidates.push(...registryCandidates(index));
  return suggestNames(candidates, input);
}

/** "Did you mean: a, b?" line, or null when there is nothing close. */
export function didYouMeanLine(suggestions: string[]): string | null {
  if (!suggestions.length) return null;
  return `Did you mean: ${suggestions.join(", ")}?`;
}
