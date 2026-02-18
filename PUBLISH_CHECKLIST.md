# Publish checklist — SkillRunner

Local commit is ready. Complete these steps to publish.

## 1. Push to GitHub

```bash
cd /home/khalid/skillrunner
git push -u origin main
```

(Requires GitHub auth: `gh auth login` or HTTPS with token.)

## 2. Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Save (if needed)

## 3. Add NPM_TOKEN secret

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: your npm token (from npmjs.com → Access Tokens)

## 4. Trigger Pages deploy

The Pages workflow runs on push to `main` when `registry/**` changes. Your push includes registry changes, so it should run automatically after step 1.

If not: push a small change under `registry/` or run the workflow manually.

## 5. Push tag for npm release

```bash
git tag v0.1.0
git push origin v0.1.0
```

This triggers the Release workflow (publish to npm + GitHub Release).

## 6. Verify

```bash
npm i -g @khalidsaidi/skillrunner
cd /tmp/any-project
skill doctor
skill install node-doctor
skill run node-doctor --yes
```

---

**Status:** Code pushed to GitHub via MCP. Steps 2–3 require repo Settings (manual). Step 4 requires `git push origin v0.1.0` (needs auth). pnpm-lock.yaml: run `git add pnpm-lock.yaml && git commit -m "chore: add pnpm-lock" && git push` if missing.
