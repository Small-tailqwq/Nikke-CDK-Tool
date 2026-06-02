# AGENTS.md - Nikke-CDK-Tool

This file is project-specific only. Keep general workflow, safety, git, and communication rules in the global `AGENTS.md`.

Read `docs/agent/project-instructions.md` for the repo details that do not belong in this short index.

## Fast Commands

```bash
npm install
npm run dev        # Vite dev server: http://localhost:5173
npm run lint       # ESLint for src/**/*.js,ts,vue
npm run validate   # Validate public/cdk-list.source.json
npm run build      # prebuild -> vite build
npm run thumbnails # Regenerate announcement thumbnails
npm run update-images
```

## Verify

- Default focused verification: `npm run lint`
- If `public/cdk-list.source.json` changes, also run: `npm run validate`
- Before handing off UI, routing, asset pipeline, or deployment-sensitive changes, run: `npm run lint` then `npm run build`
- There is no dedicated test runner and no `vue-tsc` command in this repo

## Repo Map

- `src/`: Vue 3 SPA, views/components/stores/utils
- `public/cdk-list.source.json`: source of truth for CDK data
- `public/cdk-list.json`: generated output from prebuild; do not edit manually
- `public/announcement-images/`: raw announcement images plus generated WebP and thumbnail assets
- `cloudflare-worker/`: manually deployed worker code and operational notes
- `scripts/`: build-time scripts (`prebuild.mjs`, `validate-cdk.mjs`) only; **no reverse-engineering scripts**
- `tools/`: standalone browser tools such as `tools/cdk-manager.html`; **no probe/debug tools**
- `_research/`: reverse-engineering and login analysis artifacts (see Constitutional Rules below)

## Constitutional Rules: Test & Research Artifacts

All reverse engineering, login-flow analysis, probe scripts, and captured session artifacts must reside **exclusively** under `_research/`. This directory is:

- **Outside the Vite build tree**: `_research/` is not under `public/` or `src/`, so it is **never bundled or published** to GitHub Pages. No deploy workflow changes are needed to enforce this — the Vite build system naturally excludes it.
- **Forbidden locations** (never put RE/test artifacts here):
  - `scripts/` — reserved for build-time scripts (`prebuild.mjs`, `validate-cdk.mjs`) only
  - `tools/` — reserved for standalone dev utilities (`cdk-manager.html`) only
  - `public/` — anything here gets deployed to production
  - `src/` — app source only
  - repo root — no loose test files

### Directory layout

```
_research/
  scripts/     # analysis scripts (.mjs, .py, etc.)
  artifacts/   # captured probe output data (JSON, logs, etc.)
  tools/       # browser debug/probe tools (Tampermonkey scripts, captcha debug pages)
```

### Safety rules

1. **No real credentials in source**: Never commit real emails, passwords, tokens, cookies, or session data into scripts or source files. If test data is needed, use clearly fake placeholders (e.g. `user@example.com`, `PASSWORD_PLACEHOLDER`).
2. **No secrets in logs**: `console.log` / `print()` statements that could emit auth materials must be removed or guarded by `--dry-run` / debug-only flags before committing.
3. **Artifacts with captured real data** (e.g. probe JSON output) must go into `_research/artifacts/` with a `.gitignore` entry or be cleaned up promptly. Prefer not to commit them at all.
4. **`_research/` contents are not part of the application**: Do not import from `_research/` in any `src/` or `public/` code; do not reference it in build scripts or deploy workflows.

## High-Value Constraints

- Edit `public/cdk-list.source.json`; do not hand-edit `public/cdk-list.json`
- When adding announcement art, keep the filename aligned with the matching `cdk.code` or `groupId`
- Prefer committing raw `png`/`jpg`/`jpeg` assets; `npm run build` generates WebP and thumbnails
- The production branch name is `masrer`; do not rename or "fix" it unless explicitly asked
- `vite.config.js` uses `base: '/Nikke-CDK-Tool/'`; Vue Router uses hash history to match static hosting

## Task Routing

- For repo-specific implementation details, conventions, and deployment quirks, follow `docs/agent/project-instructions.md`
- For worker behavior details, check `cloudflare-worker/README.md` when the task touches login, proxying, or API routes
