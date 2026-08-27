// NOTE: This file was reconstructed during the 0.1.3 source recovery.
// Type-only modules are erased at compile time, so types.ts never appeared in
// the published sourcemap. The shapes below are derived from how every other
// (verbatim-recovered) module uses them and from the published registry index.

export type SkillContractType =
  | "skill_md"
  | "skill_yaml"
  | "skill_json"
  | "agent_markdown"
  | "readme_markdown";

export interface SkillContractRef {
  file: string;
  type: SkillContractType;
}

export type SkillAvailability = "default" | "advanced" | "conditional";

export interface InputDef {
  type?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface SkillPrerequisites {
  tools?: string[];
  files?: string[];
  env?: string[];
  packageJsonDeps?: string[];
}

export interface SkillCapabilities {
  shell?: boolean;
  network?: boolean;
  fs_read?: boolean;
  fs_write?: boolean;
}

export interface SkillScripts {
  check?: string;
  run?: string;
}

export interface SkillDocs {
  homepage?: string;
  source?: string;
}

export interface SkillMeta {
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  kind?: "automation" | "knowledge";
  risk?: "low" | "moderate" | "high";
  availability?: SkillAvailability;
  prerequisites?: SkillPrerequisites;
  capabilities?: SkillCapabilities;
  scripts?: SkillScripts;
  inputs?: Record<string, InputDef>;
  docs?: SkillDocs;
}

export interface PlanStep {
  type: "shell";
  cmd: string;
}

export interface Plan {
  steps: PlanStep[];
  requires: {
    shell?: boolean;
    network?: boolean;
    fs_read?: boolean;
    fs_write?: boolean;
  };
  risk: "low" | "moderate" | "high";
}

export interface RegistrySkillPaths {
  dir?: string;
  skill_md?: string;
  raw_skill_md?: string;
  contract?: string;
  raw_contract?: string;
}

export interface RegistrySkill extends SkillMeta {
  contract?: SkillContractRef;
  paths?: RegistrySkillPaths;
}

export interface RegistryPack {
  name: string;
  description?: string;
  skills: string[];
}

export interface RegistrySource {
  repo?: string;
  ref?: string;
  base_url?: string;
}

export interface RegistryIndex {
  registry_version?: number;
  generated_at?: string;
  source?: RegistrySource;
  skills: RegistrySkill[];
  packs?: RegistryPack[];
}
