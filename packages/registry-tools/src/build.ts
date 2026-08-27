#!/usr/bin/env node

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  findSkillContractFile,
  parseSkillContract,
  type RegistrySkill,
} from "@khalidsaidi/skillrunner-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const SKILLS_DIR = join(REPO_ROOT, "registry", "skills");
const PACKS_DIR = join(REPO_ROOT, "registry", "packs");
const DIST_DIR = join(REPO_ROOT, "registry", "dist");
const BASE_URL =
  "https://raw.githubusercontent.com/khalidsaidi/skillrunner/main/registry/skills";

function buildIndex(): void {
  const skills: RegistrySkill[] = [];
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  } else {
    for (const name of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const skillDir = join(SKILLS_DIR, name.name);

      const contract = findSkillContractFile(skillDir);
      if (!contract) continue;

      const contractPath = join(skillDir, contract.file);
      const content = readFileSync(contractPath, "utf-8");
      let meta;
      try {
        meta = parseSkillContract(content, {
          contractType: contract.type,
          sourcePath: contract.file,
          fallbackName: name.name,
        });
      } catch {
        continue;
      }

      const contractRepoPath = `registry/skills/${name.name}/${contract.file}`;
      const contractRawPath = `${BASE_URL}/${name.name}/${contract.file}`;
      skills.push({
        name: meta.name,
        description: meta.description,
        version: meta.version,
        tags: meta.tags,
        kind: meta.kind,
        risk: meta.risk,
        availability: meta.availability,
        prerequisites: meta.prerequisites,
        capabilities: meta.capabilities,
        scripts: meta.scripts,
        inputs: meta.inputs,
        contract: {
          type: contract.type,
          file: contract.file,
        },
        paths: {
          dir: `registry/skills/${name.name}`,
          skill_md: contractRepoPath,
          raw_skill_md: contractRawPath,
          contract: contractRepoPath,
          raw_contract: contractRawPath,
        },
      });
    }
  }

  const packs: { name: string; description: string; skills: string[] }[] = [];
  if (existsSync(PACKS_DIR)) {
    for (const f of readdirSync(PACKS_DIR, { withFileTypes: true })) {
      if (f.isFile() && f.name.endsWith(".json")) {
        const p = JSON.parse(readFileSync(join(PACKS_DIR, f.name), "utf-8"));
        packs.push(p);
      }
    }
  }

  const index = {
    registry_version: 1,
    generated_at: new Date().toISOString(),
    source: {
      repo: "khalidsaidi/skillrunner",
      ref: "main",
      base_url: BASE_URL,
    },
    skills,
    packs: packs.length ? packs : [],
  };

  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(join(DIST_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log(
    `Built registry: ${skills.length} skills, ${index.packs.length} packs`,
  );
}

buildIndex();
