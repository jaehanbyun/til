# AGENTS.md

## Project Summary

This repository is the DiaDia TIL Archive site. It turns Markdown lab notes into a public static documentation/archive site for daily labs, especially `labs.iximiuz.com` practice notes.

Current workspace path:

```text
/Users/byeonjaehan/projects/personal/til
```

## Design Reference

The visual/reference prototype is the **Open Design app project named `til`**, not the public `example-docs-page` plugin page.

Reference file:

```text
/Users/byeonjaehan/Library/Application Support/Open Design/namespaces/release-stable/data/projects/a39576ef-5e3a-43b9-a2c2-0577972b381d/index.html
```

The implemented site should keep the same product-like information architecture:

- topbar with GitHub brand link, global search, KO/EN toggle, and dark-mode button
- left sidebar with categories and recent notes
- center article view for the selected note
- right sidebar with table of contents and archive metadata cards
- restrained operational UI, 8px radius, OKLCH design tokens, desktop-first responsive layout

## Content Model

Markdown files are the source of truth. There is no manual "new note" UI.

Use this structure:

```text
content/labs/<category>/<slug>.ko.md
content/labs/<category>/<slug>.en.md
```

When Korean and English files share the same category and slug, the build treats them as locale variants of the same note.

Supported frontmatter:

```md
---
title: "Service selector가 틀리면 Endpoints가 비는 이유"
description: "Kubernetes Service가 Pod를 찾는 방식과 endpoints 확인 순서."
date: "2026-06-07"
tags: [kubernetes, service, selector, endpoints, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---
```

Set `draft: true` to exclude a note from the generated site.

## Writing Guidance

The archive should read like a reusable infrastructure knowledge base, not a chronological lab journal.

- Prefer knowledge-first titles that expose the learned idea directly.
- Keep lab names such as `Klustered: Level One` in `source` or `lab`, not as the primary title.
- If one lab produces several independent ideas, split it into several notes.
- Do not force one fixed body template on every note.
- For each provided link or document, choose the article shape that best preserves the useful knowledge.

Use these body patterns as options:

- Troubleshooting note: symptom, observed signals, cause model, verification/fix, revisit points.
- Concept note: core idea, when it matters, how it works, example, caveats.
- Command recipe: goal, minimal commands, how to read output, branches on failure, verification/rollback.
- Comparison note: confused concepts, differences, selection criteria, practical example.
- Mental model note: one-line model, components, request/data flow, common breakpoints.

When summarizing external labs, keep attribution and avoid reproducing the original prompt, guided hints, or protected content. Capture personal observations, command paths, mental models, and operational checks.

## Build And Preview

This project intentionally has no npm dependencies. Use Node directly.

```bash
node scripts/build.mjs
node scripts/serve.mjs
```

Preview defaults to:

```text
http://localhost:4173
```

The build output goes to `dist/`. Generated category indexes are written under:

```text
dist/generated/index/<category>.json
```

## Deployment

Vercel:

```text
Build command: node scripts/build.mjs
Output directory: dist
```

GitHub Pages:

- `.github/workflows/deploy-pages.yml` builds and deploys `dist/`.
- It sets `SITE_BASE_PATH` automatically for project pages.

Optional environment variables:

```text
SITE_BASE_PATH=/til
SITE_URL=https://example.com
```

## GitHub Account Safety

This repo lives under `/Users/byeonjaehan/projects/personal/`, so GitHub write operations must use the `jaehanbyun` GitHub account.

Before GitHub write operations such as creating repos, PRs, issues, comments, reviews, labels, or releases:

```bash
gh auth status
gh auth switch -h github.com -u jaehanbyun
```

Do not assume `git config user.name` controls GitHub authorship. The `gh` CLI active account controls GitHub API writes.

If `gh` is not installed or not on PATH, do not perform GitHub write operations through the CLI. Ask the user to install/authenticate `gh` or create the GitHub repo manually and provide the remote URL.

## Current Implementation Notes

- `scripts/build.mjs` scans Markdown, pairs locale variants, renders static HTML pages, and emits generated category indexes.
- `src/styles/site.css` contains the Open Design `til`-style UI.
- `src/assets/site.js` handles category filtering, note switching, search, KO/EN navigation, dark mode, and command copy.
- `README.md` is user-facing setup and publishing documentation.
