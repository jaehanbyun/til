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
content/labs/kubernetes/service-selector-empty-endpoints.ko.md
content/labs/kubernetes/service-selector-empty-endpoints.en.md
content/labs/linux/systemd-socket-activation-first-connection.ko.md
content/labs/network/tcp-server-socket-bind-listen-accept.en.md
```

The category is inferred from the folder name. Supported locale suffixes are `ko` and `en`. If both files share the same category and slug, the site treats them as variants of the same note.

## Frontmatter

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

`title`, `description`, `date`, `tags`, and `source` are rendered in cards and note pages. Extra fields such as `lab` can be used to keep source context. Set `draft: true` to exclude a note from the generated site.

## Writing Method

Prefer knowledge-first notes over lab-log notes. A lab title such as `Klustered: Level One` belongs in `source` or `lab`; the article title should expose the reusable idea directly.

Good titles:

```text
Service selector가 틀리면 Endpoints가 비는 이유
dnsPolicy: Default는 Kubernetes Service DNS를 우회한다
systemd socket activation은 첫 연결에서 서비스를 깨운다
```

Avoid titles that only describe the activity:

```text
Klustered: Level One 정리
Kubernetes 디버깅 실습 로그
TCP Sockets Hands-on Intro
```

Do not force every article into the same body template. Choose the structure that best preserves the knowledge from the source.

Recommended patterns:

- Troubleshooting note: `증상 -> 관찰 신호 -> 원인 모델 -> 확인/수정 -> 다시 볼 포인트`
- Concept note: `핵심 아이디어 -> 언제 유용한가 -> 동작 원리 -> 예시 -> 주의점`
- Command recipe: `목표 -> 최소 명령 -> 출력 읽는 법 -> 실패 시 분기 -> 롤백/검증`
- Comparison note: `혼동되는 개념 -> 차이점 -> 선택 기준 -> 실전 예시`
- Mental model note: `한 줄 모델 -> 구성 요소 -> 요청/데이터 흐름 -> 깨지는 지점`

When a single lab yields multiple reusable ideas, split it into multiple notes. Keep the original link in `source`, but do not copy or translate full challenge prompts, guided hints, or paid/restricted content.

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
