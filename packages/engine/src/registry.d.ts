import type { RegistryIndex, RegistrySkill } from './types.js';
export declare const REGISTRY_CACHE_DIR: string;
export declare const SKILLS_DIR: string;
export declare const RUNS_DIR: string;
export declare function getSkillsDir(): string;
export declare function getRunsDir(): string;
export declare function fetchRemoteRegistry(baseUrl?: string): Promise<RegistryIndex>;
export declare function loadLocalRegistry(repoRoot: string): RegistryIndex | null;
export declare function searchRegistry(index: RegistryIndex, query: string): RegistrySkill[];
export declare function getSkillFromIndex(index: RegistryIndex, name: string): RegistrySkill | undefined;
//# sourceMappingURL=registry.d.ts.map