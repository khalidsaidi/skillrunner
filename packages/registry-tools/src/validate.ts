#!/usr/bin/env node

import { readdirSync, existsSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  findSkillContractFile,
  parseSkillContract,
  SUPPORTED_SKILL_CONTRACT_FILES,
} from "@khalidsaidi/skillrunner-engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const SKILLS_DIR = join(REPO_ROOT, "registry", "skills");

let failed = 0;

function validate(): void {
  if (!existsSync(SKILLS_DIR)) {
    console.log("registry/skills/ not found");
    process.exit(1);
  }

  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(SKILLS_DIR, entry.name);
    const contract = findSkillContractFile(skillDir);
    if (!contract) {
      console.error(
        `Missing contract (${SUPPORTED_SKILL_CONTRACT_FILES.join(", ")}): ${entry.name}`,
      );
      failed++;
      continue;
    }

    let meta;
    try {
      meta = parseSkillContract(
        readFileSync(join(skillDir, contract.file), "utf-8"),
        {
          contractType: contract.type,
          sourcePath: contract.file,
          fallbackName: entry.name,
        },
      );
    } catch (e) {
      console.error(
        `${entry.name}: invalid contract (${(e as Error).message})`,
      );
      failed++;
      continue;
    }

    const scriptsDir = join(skillDir, "scripts");
    const declaredScripts = [meta.scripts?.check, meta.scripts?.run].filter(
      (v): v is string => Boolean(v),
    );

    if (declaredScripts.length > 0) {
      for (const scriptRelPath of declaredScripts) {
        const scriptPath = join(skillDir, scriptRelPath);
        if (!existsSync(scriptPath)) {
          console.error(
            `${entry.name}: missing declared script ${scriptRelPath}`,
          );
          failed++;
          continue;
        }
        const st = statSync(scriptPath);
        if ((st.mode & 0o111) === 0) {
          console.error(`${entry.name}: ${scriptRelPath} not executable`);
          failed++;
        }
      }
      continue;
    }

    if (existsSync(scriptsDir)) {
      const defaultScripts = [
        join(scriptsDir, "check.sh"),
        join(scriptsDir, "run.sh"),
      ];
      for (const scriptPath of defaultScripts) {
        if (!existsSync(scriptPath)) continue;
        const st = statSync(scriptPath);
        if ((st.mode & 0o111) === 0) {
          console.error(
            `${entry.name}: ${scriptPath.replace(`${skillDir}/`, "")} not executable`,
          );
          failed++;
        }
      }
    }
  }

  if (failed) {
    console.error(`Validation failed: ${failed} error(s)`);
    process.exit(1);
  }
  console.log("Registry validation passed");
}

validate();
