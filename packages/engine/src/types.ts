export type SkillAvailability = "default" | "advanced" | "conditional";

export type SkillContractType =
  | "skill_md"
  | "skill_yaml"
  | "skill_json"
  | "agent_markdown"
  | "readme_markdown";

export interface SkillContractRef {
  type: SkillContractType;
  file: string;
}

export interface SkillPrerequisites {
  tools?: string[];
  files?: string[];
  env?: string[];
  packageJsonDeps?: string[];
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
  capabilities?: {
    shell?: boolean;
    network?: boolean;
    fs_read?: boolean;
    fs_write?: boolean;
  };
  scripts?: {
    check?: string;
    run?: string;
  };
  inputs?: Record<string, InputDef>;
  docs?: {
    homepage?: string;
    source?: string;
  };
}

export interface InputDef {
  type: "string" | "boolean" | "enum";
  default?: string | boolean;
  values?: string[];
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

export interface PlanStep {
  type: "shell";
  cmd: string;
}

export interface RegistryIndex {
  registry_version: number;
  generated_at: string;
  source: {
    repo: string;
    ref: string;
    base_url: string;
  };
  skills: RegistrySkill[];
  packs: RegistryPack[];
}

export interface RegistrySkill {
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  kind?: "automation" | "knowledge";
  risk?: "low" | "moderate" | "high";
  availability?: SkillAvailability;
  prerequisites?: SkillPrerequisites;
  capabilities?: Record<string, boolean>;
  scripts?: Record<string, string>;
  inputs?: Record<string, unknown>;
  contract?: SkillContractRef;
  paths: {
    dir: string;
    skill_md: string;
    raw_skill_md: string;
    contract?: string;
    raw_contract?: string;
  };
}

export interface RegistryPack {
  name: string;
  description: string;
  skills: string[];
}
