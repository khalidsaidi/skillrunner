# SkillRunner

User-friendly skill runner: CLI + local dashboard + skill registry.

## 60-second quickstart

```bash
npm i -g @khalidsaidi/skillrunner
# or: pnpm add -g @khalidsaidi/skillrunner

skill doctor                    # Check environment
skill search lint               # Search registry
skill install node-doctor       # Install a skill
skill plan node-doctor          # Preview what will run
skill run node-doctor           # Run (with confirmation)
skill run node-doctor --yes     # Skip confirmation
skill open                      # Open dashboard
```

## Cursor integration

Copy skills into Cursor's skills directory:

```bash
skill cursor install code-review-checklist --scope project   # .cursor/skills/
skill cursor install code-review-checklist --scope global    # ~/.cursor/skills/
skill cursor list --scope both
```

## Where skills come from

- **Registry**: `registry/skills/` in this repo + generated `registry/dist/index.json`
- **Index**: Published via GitHub Pages when `registry/**` changes
- No external scraping; data is static and versioned

## Safety model

- **Plan before run**: `skill plan` shows steps and risk
- **No auto-push**: Skills never push to remotes
- **Guard**: Blocks scripts with banned patterns (sudo, rm -rf, curl|sh, etc.)
