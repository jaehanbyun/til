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
title: "Klustered: Level One"
description: "Kubernetes debugging lab notes."
date: "2026-06-07"
tags: [kubernetes, kubectl, service]
source: "https://labs.iximiuz.com/"
---
```

Set `draft: true` to exclude a note from the generated site.

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
