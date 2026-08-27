# SkillRunner

User-friendly skill runner: CLI + local dashboard + skill registry.

## Source recovery (0.1.3)

The original "add all packages" commit never actually added the package
sources, and the working tree was lost. This tree was recovered from the only
surviving copy of the shipped code: the `@khalidsaidi/skillrunner@0.1.3` npm
tarball (`dist/cli.js` + `dist/cli.js.map`, whose sourcemap embeds the full
original TypeScript via `sourcesContent`).

What is verbatim vs reconstructed:

- **Verbatim** (byte-for-byte from the published sourcemap): all 21 TypeScript
  sources under `packages/cli/src/` and `packages/engine/src/` (except the two
  files below), plus `packages/cli/package.json` (from the tarball) and the
  registry snapshot under `registry/skills/` (73 skills, from the bundled
  `dist/registry/`).
- **Reconstructed** (not present in the sourcemap, rebuilt from usage and the
  published artifacts; each file carries a NOTE header):
  `packages/engine/src/types.ts` (type-only, erased at compile time),
  `packages/engine/src/index.ts` (re-export barrel), the engine /
  registry-tools / root `package.json`s, `pnpm-workspace.yaml`, tsconfigs,
  `tsup.config.ts`, `packages/cli/scripts/copy-bundled-registry.mjs`,
  `packages/registry-tools/` (its `registry:build` output was verified
  byte-identical to the shipped `dist/registry/dist/index.json`, apart from
  `generated_at`), `registry/packs/*.yaml` (content lifted from the shipped
  index), and `eslint.config.js`.
- **Build fidelity**: `pnpm install && pnpm build` reproduces the shipped
  `dist/cli.js` except for a 10-line import-hoisting ordering difference from
  a newer esbuild patch version; `--version` reports 0.1.3 and the full
  search/info/install/plan/run/logs lifecycle was verified against the rebuilt
  binary, including the bundled-registry offline fallback.
- **Not recoverable**: the `dashboard/` and `adapters/` packages mentioned in
  CONTRIBUTING.md (never published anywhere), the original registry-tools
  implementation, and the original lint/format configs. Two verbatim files
  (`packages/cli/src/commands/run.ts`, `README.md`'s missing trailing
  newline — since fixed by this note) do not match any prettier 3.x default
  output, so `pnpm format:check` flags `run.ts`; it was left byte-exact
  rather than reformatted.

## Development

```bash
pnpm install
pnpm build            # builds registry index, engine, then the CLI
node packages/cli/dist/cli.js --help
```

See CONTRIBUTING.md for the project structure and registry authoring flow.
