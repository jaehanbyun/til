# DiaDia TIL Archive

Public archive for hands-on infrastructure labs and daily TIL notes.

The site is generated from Markdown files under `content/labs`. There is no manual "new note" UI. Add Markdown to Git, push, and the static site rebuilds.

## Content Structure

```text
content/labs/<category>/<slug>.ko.md
content/labs/<category>/<slug>.en.md
```

Examples:

```text
content/labs/kubernetes/klustered-level-one.ko.md
content/labs/kubernetes/klustered-level-one.en.md
content/labs/linux/systemd-socket-activation.ko.md
content/labs/network/tcp-sockets-intro.en.md
```

The category is inferred from the folder name. Supported locale suffixes are `ko` and `en`. If both files share the same category and slug, the site treats them as variants of the same note.

## Frontmatter

```md
---
title: "Klustered: Level One"
description: "Kubernetes debugging lab notes."
date: "2026-06-07"
tags: [kubernetes, kubectl, service]
source: "https://labs.iximiuz.com/"
---
```

`title`, `description`, `date`, `tags`, and `source` are rendered in cards and note pages. Set `draft: true` to exclude a note from the generated site.

## Local Preview

```bash
node scripts/build.mjs
node scripts/serve.mjs
```

The preview server defaults to <http://localhost:4173>.

## Vercel

Vercel can deploy the repository without extra dependencies.

- Build command: `node scripts/build.mjs`
- Output directory: `dist`

The included `vercel.json` already sets these values.

## GitHub Pages

The included workflow builds and deploys `dist/` on pushes to `main`.

For project pages, the workflow automatically sets `SITE_BASE_PATH` to the repository name. For a user site such as `jaehanbyun.github.io`, it uses the root path.

## Environment Variables

- `SITE_BASE_PATH`: optional base path such as `/til`
- `SITE_URL`: optional canonical site URL, used for `sitemap.xml`
