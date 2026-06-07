import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "labs");
const DIST_DIR = path.join(ROOT, "dist");
const ASSET_DIR = path.join(ROOT, "src", "assets");
const STYLE_DIR = path.join(ROOT, "src", "styles");
const DEFAULT_LOCALE = "ko";
const LOCALES = ["ko", "en"];
const SITE_BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH || "");
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");

const CATEGORY_META = {
  linux: {
    label: "Linux",
    summary: "Processes, filesystems, systemd, shells, and production Linux fundamentals.",
  },
  kubernetes: {
    label: "Kubernetes",
    summary: "Cluster debugging, workloads, services, DNS, and control-plane mechanics.",
  },
  k8s: {
    label: "Kubernetes",
    summary: "Cluster debugging, workloads, services, DNS, and control-plane mechanics.",
  },
  network: {
    label: "Network",
    summary: "TCP, DNS, routing, sockets, proxies, and protocol-level troubleshooting.",
  },
};

const UI = {
  ko: {
    archive: "Archive",
    allNotes: "All Notes",
    categories: "Categories",
    recent: "Recent Labs",
    search: "노트 검색",
    searchPlaceholder: "제목, 태그, 명령어 검색",
    noResults: "검색 결과가 없습니다.",
    toc: "On this page",
    reviewerMap: "Reviewer Map",
    latest: "Latest Labs",
    notes: "notes",
    variants: "locale variants",
    updated: "Updated",
    source: "Source",
    tags: "Tags",
    readNote: "Read note",
    category: "Category",
    language: "Language",
    github: "github.com/jaehanbyun",
    sublabel: "TIL Archive",
    heroTitle: "DiaDia TIL Archive",
    heroLead:
      "Labs, failure modes, commands, and debugging notes from daily hands-on infrastructure practice.",
    heroNote:
      "Markdown files in content/labs are the source of truth. Push a note and the archive rebuilds itself.",
    categoryPage: "Category Archive",
    emptyToc: "Headings from the current note appear here.",
    homeCta: "Browse archive",
  },
  en: {
    archive: "Archive",
    allNotes: "All Notes",
    categories: "Categories",
    recent: "Recent Labs",
    search: "Search notes",
    searchPlaceholder: "Search title, tags, commands",
    noResults: "No matching notes.",
    toc: "On this page",
    reviewerMap: "Reviewer Map",
    latest: "Latest Labs",
    notes: "notes",
    variants: "locale variants",
    updated: "Updated",
    source: "Source",
    tags: "Tags",
    readNote: "Read note",
    category: "Category",
    language: "Language",
    github: "github.com/jaehanbyun",
    sublabel: "TIL Archive",
    heroTitle: "DiaDia TIL Archive",
    heroLead:
      "Labs, failure modes, commands, and debugging notes from daily hands-on infrastructure practice.",
    heroNote:
      "Markdown files in content/labs are the source of truth. Push a note and the archive rebuilds itself.",
    categoryPage: "Category Archive",
    emptyToc: "Headings from the current note appear here.",
    homeCta: "Browse archive",
  },
};

function normalizeBasePath(value) {
  if (!value || value === "/") return "";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function toUrl(urlPath = "/") {
  if (/^https?:\/\//.test(urlPath)) return urlPath;
  const clean = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `${SITE_BASE_PATH}${clean}`;
}

function absoluteUrl(urlPath) {
  return SITE_URL ? `${SITE_URL}${toUrl(urlPath)}` : toUrl(urlPath);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function writeText(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, data);
}

function copyStaticAssets() {
  ensureDir(path.join(DIST_DIR, "assets"));
  for (const file of ["site.css"]) {
    fs.copyFileSync(path.join(STYLE_DIR, file), path.join(DIST_DIR, "assets", file));
  }
  for (const file of ["site.js", "favicon.svg"]) {
    fs.copyFileSync(path.join(ASSET_DIR, file), path.join(DIST_DIR, "assets", file));
  }
}

function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) return [{}, source.trim()];
  const end = source.indexOf("\n---", 4);
  if (end === -1) return [{}, source.trim()];
  const raw = source.slice(4, end).trim();
  const body = source.slice(end + 4).trim();
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = parseFrontmatterValue(match[2]);
  }
  return [data, body];
}

function parseFrontmatterValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function discoverMarkdownFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = [];
  for (const category of fs.readdirSync(CONTENT_DIR).sort()) {
    const categoryDir = path.join(CONTENT_DIR, category);
    if (!fs.statSync(categoryDir).isDirectory()) continue;
    for (const file of fs.readdirSync(categoryDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const match = file.match(/^(.+)\.(ko|en)\.md$/);
      if (!match) continue;
      files.push({
        filePath: path.join(categoryDir, file),
        category,
        slug: match[1],
        locale: match[2],
      });
    }
  }
  return files;
}

function buildCatalog() {
  const groups = new Map();
  for (const entry of discoverMarkdownFiles()) {
    const [frontmatter, body] = parseFrontmatter(readText(entry.filePath));
    if (frontmatter.draft === true) continue;
    const rendered = renderMarkdown(body);
    const key = `${entry.category}/${entry.slug}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        category: entry.category,
        slug: entry.slug,
        variants: {},
      });
    }
    groups.get(key).variants[entry.locale] = {
      ...entry,
      frontmatter,
      body,
      html: rendered.html,
      toc: rendered.toc,
      plainText: rendered.plainText,
      excerpt: frontmatter.description || rendered.excerpt,
      codeBlocks: rendered.codeBlocks,
    };
  }

  const notes = [...groups.values()].map((group) => {
    const preferred = group.variants[DEFAULT_LOCALE] || group.variants.en || Object.values(group.variants)[0];
    const date = preferred.frontmatter.date || preferred.frontmatter.updated || "";
    return {
      ...group,
      title: preferred.frontmatter.title || titleFromSlug(group.slug),
      description: preferred.frontmatter.description || preferred.excerpt || "",
      date,
      tags: normalizeTags(preferred.frontmatter.tags),
      source: preferred.frontmatter.source || "",
    };
  });

  notes.sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });

  const categories = [...new Set(notes.map((note) => note.category))]
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))
    .map((category) => {
      const categoryNotes = notes.filter((note) => note.category === category);
      return {
        id: category,
        label: categoryLabel(category),
        summary: categorySummary(category),
        count: categoryNotes.length,
      };
    });

  return { notes, categories };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string" && tags.length > 0) {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function categoryLabel(category) {
  return CATEGORY_META[category]?.label || titleFromSlug(category);
}

function categorySummary(category) {
  return CATEGORY_META[category]?.summary || "Field notes and lab writeups.";
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function getVariant(note, locale) {
  return note.variants[locale] || note.variants[DEFAULT_LOCALE] || note.variants.en || Object.values(note.variants)[0];
}

function notePath(note, locale) {
  return `/${locale}/labs/${note.category}/${note.slug}/`;
}

function categoryPath(category, locale) {
  return `/${locale}/categories/${category}/`;
}

function localeHome(locale) {
  return `/${locale}/`;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const toc = [];
  const plain = [];
  const codeBlocks = [];
  let paragraph = [];
  let list = null;
  let inFence = false;
  let fenceLang = "";
  let fenceLines = [];
  const headingIds = new Map();

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInline(paragraph.join(" ").trim())}</p>`);
    plain.push(paragraph.join(" ").trim());
    paragraph = [];
  };

  const closeList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };

  const closeFence = () => {
    codeBlocks.push(fenceLines.join("\n"));
    html.push(
      `<pre><code${fenceLang ? ` class="language-${escapeAttr(fenceLang)}"` : ""}>${escapeHtml(
        fenceLines.join("\n"),
      )}</code></pre>`,
    );
    plain.push(fenceLines.join("\n"));
    inFence = false;
    fenceLang = "";
    fenceLines = [];
  };

  for (const line of lines) {
    const fence = line.match(/^```([A-Za-z0-9_-]+)?\s*$/);
    if (fence && !inFence) {
      flushParagraph();
      closeList();
      inFence = true;
      fenceLang = fence[1] || "";
      fenceLines = [];
      continue;
    }
    if (fence && inFence) {
      closeFence();
      continue;
    }
    if (inFence) {
      fenceLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = uniqueHeadingId(slugify(text), headingIds);
      if (level >= 2) toc.push({ level, text: stripInline(text), id });
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      plain.push(stripInline(text));
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${renderInline(unordered[1].trim())}</li>`);
      plain.push(unordered[1].trim());
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${renderInline(ordered[1].trim())}</li>`);
      plain.push(ordered[1].trim());
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInline(quote[1].trim())}</blockquote>`);
      plain.push(quote[1].trim());
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inFence) closeFence();

  const plainText = plain.join(" ");
  return {
    html: html.join("\n"),
    toc,
    plainText,
    excerpt: plainText.slice(0, 180),
    codeBlocks,
  };
}

function uniqueHeadingId(base, ids) {
  const fallback = base || "section";
  const count = ids.get(fallback) || 0;
  ids.set(fallback, count + 1);
  return count === 0 ? fallback : `${fallback}-${count + 1}`;
}

function stripInline(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label, href) => `<a href="${escapeAttr(href)}">${label}</a>`,
  );
  return html;
}

function slugify(value) {
  return stripInline(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function renderTopbar({ locale, localeLinks }) {
  const t = UI[locale];
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="identity" href="https://github.com/jaehanbyun" target="_blank" rel="noreferrer noopener" aria-label="Open jaehanbyun on GitHub">
          <span class="identity-primary">${t.github}</span>
          <span class="identity-secondary">${t.sublabel}</span>
        </a>
        <nav class="topnav" aria-label="Primary navigation">
          <a href="${toUrl(localeHome(locale))}">${t.archive}</a>
          <a href="${toUrl(categoryPath("kubernetes", locale))}">Kubernetes</a>
          <a href="${toUrl(categoryPath("linux", locale))}">Linux</a>
          <a href="${toUrl(categoryPath("network", locale))}">Network</a>
        </nav>
        <div class="actions">
          <div class="locale-toggle" aria-label="${t.language}">
            ${renderLocaleOption("ko", locale, localeLinks.ko)}
            ${renderLocaleOption("en", locale, localeLinks.en)}
          </div>
          <button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle color theme">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Zm0 2.2v13.2a6.6 6.6 0 0 1 0-13.2Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="menu-toggle" type="button" data-menu-toggle aria-label="Toggle navigation">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderLocaleOption(targetLocale, currentLocale, href) {
  const label = targetLocale.toUpperCase();
  if (!href) return `<span class="locale-option is-disabled">${label}</span>`;
  return `<a class="locale-option${targetLocale === currentLocale ? " is-active" : ""}" href="${toUrl(href)}"${targetLocale === currentLocale ? ' aria-current="true"' : ""}>${label}</a>`;
}

function renderSidebar({ catalog, locale, activeCategory }) {
  const t = UI[locale];
  const recent = catalog.notes.slice(0, 6);
  return `
    <aside class="sidebar" data-sidebar>
      <div class="sidebar-section">
        <div class="panel-label">${t.categories}</div>
        <a class="sidebar-link${activeCategory ? "" : " is-active"}" href="${toUrl(localeHome(locale))}">
          <span>${t.allNotes}</span>
          <strong>${catalog.notes.length}</strong>
        </a>
        ${catalog.categories
          .map(
            (category) => `
              <a class="sidebar-link${category.id === activeCategory ? " is-active" : ""}" href="${toUrl(categoryPath(category.id, locale))}">
                <span>${escapeHtml(category.label)}</span>
                <strong>${category.count}</strong>
              </a>
            `,
          )
          .join("")}
      </div>
      <div class="sidebar-section recent-list">
        <div class="panel-label">${t.recent}</div>
        ${recent
          .map((note) => {
            const variant = getVariant(note, locale);
            return `
              <a class="recent-link" href="${toUrl(notePath(note, variant.locale))}">
                <span>${escapeHtml(variant.frontmatter.title || note.title)}</span>
                <small>${escapeHtml(categoryLabel(note.category))}</small>
              </a>
            `;
          })
          .join("")}
      </div>
    </aside>
  `;
}

function renderLayout({ catalog, locale, title, description, activeCategory, localeLinks, body, rightPanel, pageClass = "" }) {
  const t = UI[locale];
  const fullTitle = title === t.heroTitle ? title : `${title} · DiaDia TIL Archive`;
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta property="og:title" content="${escapeAttr(fullTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="${toUrl("/assets/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${toUrl("/assets/site.css")}">
  <script>
    (() => {
      const stored = localStorage.getItem("theme");
      const theme = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
    })();
  </script>
</head>
<body class="${escapeAttr(pageClass)}">
  <div class="grain" aria-hidden="true"></div>
  <div class="shell">
    ${renderTopbar({ locale, localeLinks })}
    <main class="docs-frame">
      ${renderSidebar({ catalog, locale, activeCategory })}
      <section class="content-frame">
        ${body}
      </section>
      ${rightPanel}
    </main>
  </div>
  <script src="${toUrl("/assets/site.js")}"></script>
</body>
</html>`;
}

function renderHomePage(catalog, locale) {
  const t = UI[locale];
  const latestNotes = catalog.notes;
  const categories = catalog.categories;
  const variantCount = catalog.notes.reduce((sum, note) => sum + Object.keys(note.variants).length, 0);
  const body = `
    <section class="archive-hero">
      <div class="eyeline">labs.iximiuz.com / infra practice / markdown archive</div>
      <h1>${t.heroTitle}</h1>
      <p>${t.heroLead}</p>
      <div class="hero-note">${t.heroNote}</div>
      <div class="stat-row" aria-label="Archive stats">
        <div><strong>${catalog.notes.length}</strong><span>${t.notes}</span></div>
        <div><strong>${categories.length}</strong><span>${t.categories}</span></div>
        <div><strong>${variantCount}</strong><span>${t.variants}</span></div>
      </div>
    </section>
    ${renderSearch(locale)}
    <section class="note-grid" data-note-grid>
      ${latestNotes.map((note) => renderNoteCard(note, locale)).join("")}
    </section>
    <p class="empty-state" data-empty-state hidden>${t.noResults}</p>
  `;

  const rightPanel = `
    <aside class="right-panel">
      <div class="sticky-panel">
        <div class="panel-label">${t.reviewerMap}</div>
        <div class="signal-card">
          <strong>Depth over volume</strong>
          <span>Each note records the failure, the command path, the root cause, and the durable takeaway.</span>
        </div>
        <div class="signal-card">
          <strong>Public by default</strong>
          <span>Designed for portfolio review: concise summaries, concrete commands, and bilingual access.</span>
        </div>
        <div class="signal-card">
          <strong>Source controlled</strong>
          <span>No CMS. A Git push is the publishing workflow.</span>
        </div>
      </div>
    </aside>
  `;

  return renderLayout({
    catalog,
    locale,
    title: t.heroTitle,
    description: t.heroLead,
    activeCategory: "",
    localeLinks: { ko: localeHome("ko"), en: localeHome("en") },
    body,
    rightPanel,
    pageClass: "home-page",
  });
}

function renderCategoryPage(catalog, locale, category) {
  const t = UI[locale];
  const categoryNotes = catalog.notes.filter((note) => note.category === category.id);
  const body = `
    <section class="category-head">
      <div class="eyeline">${t.categoryPage}</div>
      <h1>${escapeHtml(category.label)}</h1>
      <p>${escapeHtml(category.summary)}</p>
    </section>
    ${renderSearch(locale)}
    <section class="note-grid" data-note-grid>
      ${categoryNotes.map((note) => renderNoteCard(note, locale)).join("")}
    </section>
    <p class="empty-state" data-empty-state hidden>${t.noResults}</p>
  `;

  const rightPanel = `
    <aside class="right-panel">
      <div class="sticky-panel">
        <div class="panel-label">${t.category}</div>
        <div class="category-summary">
          <strong>${escapeHtml(category.label)}</strong>
          <span>${category.count} ${t.notes}</span>
          <p>${escapeHtml(category.summary)}</p>
        </div>
      </div>
    </aside>
  `;

  return renderLayout({
    catalog,
    locale,
    title: category.label,
    description: category.summary,
    activeCategory: category.id,
    localeLinks: {
      ko: categoryPath(category.id, "ko"),
      en: categoryPath(category.id, "en"),
    },
    body,
    rightPanel,
    pageClass: "category-page",
  });
}

function renderSearch(locale) {
  const t = UI[locale];
  return `
    <div class="search-row">
      <label>
        <span>${t.search}</span>
        <input data-search type="search" placeholder="${escapeAttr(t.searchPlaceholder)}" autocomplete="off">
      </label>
    </div>
  `;
}

function renderNoteCard(note, locale) {
  const variant = getVariant(note, locale);
  const tags = normalizeTags(variant.frontmatter.tags).length ? normalizeTags(variant.frontmatter.tags) : note.tags;
  const searchText = [
    variant.frontmatter.title || note.title,
    variant.frontmatter.description || note.description,
    categoryLabel(note.category),
    tags.join(" "),
    variant.plainText,
  ].join(" ");
  return `
    <article class="note-card" data-note-card data-search-text="${escapeAttr(searchText.toLowerCase())}">
      <div class="note-card-top">
        <span>${escapeHtml(categoryLabel(note.category))}</span>
        <span>${Object.keys(note.variants).map((item) => item.toUpperCase()).join(" / ")}</span>
      </div>
      <h2><a href="${toUrl(notePath(note, variant.locale))}">${escapeHtml(variant.frontmatter.title || note.title)}</a></h2>
      <p>${escapeHtml(variant.frontmatter.description || note.description || variant.excerpt)}</p>
      <div class="tag-row">
        ${tags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <a class="read-link" href="${toUrl(notePath(note, variant.locale))}">${UI[locale].readNote}</a>
    </article>
  `;
}

function renderNotePage(catalog, note, locale) {
  const variant = getVariant(note, locale);
  const actualLocale = variant.locale;
  const t = UI[actualLocale];
  const tags = normalizeTags(variant.frontmatter.tags).length ? normalizeTags(variant.frontmatter.tags) : note.tags;
  const title = variant.frontmatter.title || note.title;
  const description = variant.frontmatter.description || note.description || variant.excerpt;
  const localeLinks = {
    ko: note.variants.ko ? notePath(note, "ko") : "",
    en: note.variants.en ? notePath(note, "en") : "",
  };
  const body = `
    <article class="doc-article">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${toUrl(localeHome(actualLocale))}">${t.archive}</a>
        <span>/</span>
        <a href="${toUrl(categoryPath(note.category, actualLocale))}">${escapeHtml(categoryLabel(note.category))}</a>
      </nav>
      <header class="doc-head">
        <div class="doc-meta-line">
          <span>${escapeHtml(categoryLabel(note.category))}</span>
          <span>${actualLocale.toUpperCase()}</span>
          ${variant.frontmatter.date ? `<span>${t.updated} ${escapeHtml(variant.frontmatter.date)}</span>` : ""}
        </div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="tag-row">
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${
          variant.frontmatter.source
            ? `<a class="source-link" href="${escapeAttr(variant.frontmatter.source)}" target="_blank" rel="noreferrer noopener">${t.source}</a>`
            : ""
        }
      </header>
      <div class="prose">
        ${variant.html}
      </div>
    </article>
  `;

  const rightPanel = `
    <aside class="right-panel">
      <div class="sticky-panel">
        <div class="panel-label">${t.toc}</div>
        ${
          variant.toc.length
            ? `<nav class="toc" aria-label="${t.toc}">
                ${variant.toc
                  .map(
                    (heading) =>
                      `<a class="toc-level-${heading.level}" href="#${heading.id}">${escapeHtml(heading.text)}</a>`,
                  )
                  .join("")}
              </nav>`
            : `<p class="toc-empty">${t.emptyToc}</p>`
        }
      </div>
    </aside>
  `;

  return renderLayout({
    catalog,
    locale: actualLocale,
    title,
    description,
    activeCategory: note.category,
    localeLinks,
    body,
    rightPanel,
    pageClass: "note-page",
  });
}

const CATEGORY_COLORS = {
  all: "oklch(58% 0.16 145)",
  linux: "oklch(58% 0.18 255)",
  kubernetes: "oklch(58% 0.16 145)",
  k8s: "oklch(58% 0.16 145)",
  network: "oklch(62% 0.17 205)",
  containers: "oklch(68% 0.15 60)",
  storage: "oklch(62% 0.16 305)",
};

function renderTilAppPage(catalog, locale, options = {}) {
  const initialCategory = options.initialCategory || "all";
  const initialNoteKey = options.initialNoteKey || catalog.notes[0]?.key || "";
  const data = buildClientArchive(catalog, locale, initialCategory, initialNoteKey, options.initialView);
  const title = options.title || "TIL Archive";
  const description =
    options.description ||
    "DiaDia lab notes archive generated from Markdown files in a Git repository.";

  return `<!doctype html>
<html lang="${locale}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="${toUrl("/assets/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${toUrl("/assets/site.css")}">
  <script>
    window.__TIL_ARCHIVE__ = ${safeJson(data)};
    (() => {
      const savedTheme = localStorage.getItem("diadia-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.dataset.theme = savedTheme;
      }
    })();
  </script>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <a class="brand" href="https://github.com/jaehanbyun" target="_blank" rel="noreferrer noopener" aria-label="jaehanbyun GitHub profile">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8 12a4 4 0 0 1 4-4h2.5a4 4 0 0 1 0 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <path d="M16 12a4 4 0 0 1-4 4H9.5a4 4 0 0 1 0-8H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </span>
        <span class="brand-title">
          <strong>github.com/jaehanbyun</strong>
          <span>TIL Archive</span>
        </span>
      </a>

      <label class="global-search" for="searchInput">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m20 20-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <input id="searchInput" type="search" placeholder="${locale === "ko" ? "노트, 명령어, 카테고리 검색" : "Search notes, commands, categories"}" autocomplete="off">
      </label>

      <div class="actions">
        <div class="segmented" role="group" aria-label="${locale === "ko" ? "언어 선택" : "Language"}">
          <a class="segmented-link" data-lang="ko" href="${toUrl(options.localeLinks?.ko || localeHome("ko"))}">KO</a>
          <a class="segmented-link" data-lang="en" href="${toUrl(options.localeLinks?.en || localeHome("en"))}">EN</a>
        </div>
        <button class="icon-button" id="themeToggle" type="button" aria-label="${locale === "ko" ? "다크 모드 전환" : "Toggle dark mode"}" title="${locale === "ko" ? "다크 모드 전환" : "Toggle dark mode"}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 14.3A7.6 7.6 0 0 1 9.7 4a8.7 8.7 0 1 0 10.3 10.3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
          </svg>
        </button>
      </div>
    </header>

    <div class="workspace">
      <aside class="sidebar" aria-label="${locale === "ko" ? "카테고리와 노트 목록" : "Categories and note list"}">
        <p class="section-label">Categories</p>
        <ul class="category-list" id="categoryList"></ul>
        <div class="divider note-block"></div>
        <div class="note-block">
          <p class="section-label">Recent notes</p>
          <ul class="note-list" id="noteList"></ul>
          <div class="empty-state" id="emptyState">${locale === "ko" ? "검색 조건에 맞는 노트가 없습니다. 다른 카테고리나 키워드를 선택하세요." : "No notes match this filter. Try another category or keyword."}</div>
        </div>
      </aside>

      <main class="main">
        <div class="article-shell">
          <div class="mobile-filter">
            <p class="section-label">Matching notes</p>
            <ul class="note-list" id="mobileNoteList"></ul>
          </div>

          <section class="category-results" id="categoryResults" aria-labelledby="categoryResultsTitle" hidden>
            <header class="category-results-head">
              <div>
                <p class="section-label">${locale === "ko" ? "선택한 카테고리" : "Selected category"}</p>
                <h1 id="categoryResultsTitle"></h1>
                <p id="categoryResultsSummary"></p>
              </div>
              <span class="pill" id="categoryResultsCount"></span>
            </header>
            <div class="result-card-grid" id="categoryCardGrid"></div>
            <div class="empty-state" id="categoryEmptyState">${locale === "ko" ? "검색 조건에 맞는 글이 없습니다." : "No notes match this filter."}</div>
          </section>

          <article class="article-grid" id="article">
            <header class="article-header">
              <div class="doc-meta-row">
                <div class="status-row">
                  <span class="pill success" id="articleCategory"></span>
                  <span class="pill" id="articleDate"></span>
                  <span class="pill">KO / EN</span>
                </div>
                <span class="pill">${locale === "ko" ? "repo 자동 렌더" : "repo auto render"}</span>
              </div>
              <h1 class="article-title" id="articleTitle"></h1>
              <p class="article-summary" id="articleSummary"></p>
              <div class="source-row">
                <a class="source-chip" id="sourceLink" href="#" target="_blank" rel="noreferrer noopener" hidden>${locale === "ko" ? "원문 보기" : "View source"}</a>
              </div>
            </header>

            <section class="panel" aria-labelledby="learningTitle">
              <div class="panel-header">
                <h2 id="learningTitle">${locale === "ko" ? "핵심 학습 포인트" : "Key learning points"}</h2>
                <span class="pill" id="readTime"></span>
              </div>
              <div class="panel-body">
                <ul class="learning-list" id="learningList"></ul>
              </div>
            </section>

            <section class="article-section" id="context">
              <h2>${locale === "ko" ? "실습 맥락" : "Lab context"}</h2>
              <div class="article-copy" id="contextBody"></div>
            </section>

            <section class="article-section" id="commands">
              <h2>${locale === "ko" ? "기록할 명령어" : "Commands to keep"}</h2>
              <div class="article-copy" id="commandsBody"></div>
              <div class="code-card">
                <div class="code-head">
                  <span>terminal</span>
                  <button class="copy-btn" id="copyCommand" type="button">copy</button>
                </div>
                <pre><code id="commandBlock"></code></pre>
              </div>
            </section>

            <section class="article-section" id="publish">
              <h2>${locale === "ko" ? "GitHub 자동 렌더링 구조" : "GitHub auto-rendering structure"}</h2>
              <div class="article-copy" id="publishBody"></div>
              <div class="deploy-grid">
                <div class="panel">
                  <div class="panel-header">
                    <h2>${locale === "ko" ? "Repo 입력 파일" : "Repository inputs"}</h2>
                  </div>
                  <div class="panel-body">
                    <ul class="path-list" id="pathList"></ul>
                  </div>
                </div>
                <div class="panel">
                  <div class="panel-header">
                    <h2>${locale === "ko" ? "자동 렌더 체크" : "Render checks"}</h2>
                  </div>
                  <div class="panel-body">
                    <div class="progress-line"><span>repo scan</span><strong>on push</strong></div>
                    <div class="progress-line"><span>markdown</span><strong>auto included</strong></div>
                    <div class="progress-line"><span>ko/en pair</span><strong>same slug</strong></div>
                    <div class="progress-line"><span>deploy target</span><strong>Vercel / GitHub Pages</strong></div>
                  </div>
                </div>
              </div>
            </section>

            <section class="article-section" id="next">
              <h2>${locale === "ko" ? "다음에 연결할 노트" : "Next notes to connect"}</h2>
              <div class="article-copy" id="nextBody"></div>
            </section>

            <section class="article-section full-note-section" id="full-note">
              <h2>${locale === "ko" ? "전체 정리" : "Full note"}</h2>
              <div class="prose" id="fullNoteBody"></div>
            </section>
          </article>
        </div>
      </main>

      <aside class="toc" aria-label="${locale === "ko" ? "문서 목차" : "Table of contents"}">
        <div class="toc-card">
          <div>
            <p class="section-label">On this page</p>
            <nav id="tocNav">
              <a class="toc-link" href="#context">${locale === "ko" ? "실습 맥락" : "Lab context"}</a>
              <a class="toc-link" href="#commands">${locale === "ko" ? "기록할 명령어" : "Commands"}</a>
              <a class="toc-link" href="#publish">${locale === "ko" ? "GitHub 자동 렌더링" : "GitHub rendering"}</a>
              <a class="toc-link" href="#next">${locale === "ko" ? "다음 노트" : "Next notes"}</a>
              <a class="toc-link" href="#full-note">${locale === "ko" ? "전체 정리" : "Full note"}</a>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  </div>
  <script src="${toUrl("/assets/site.js")}"></script>
</body>
</html>`;
}

function safeJson(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function buildClientArchive(catalog, locale, initialCategory, initialNoteKey, initialView = "category") {
  const categories = [
    {
      id: "all",
      label: locale === "ko" ? "전체" : "All",
      summary: locale === "ko" ? "전체 카테고리의 지식 노트입니다." : "Knowledge notes across every category.",
      color: CATEGORY_COLORS.all,
      count: catalog.notes.length,
      url: toUrl(localeHome(locale)),
    },
    ...catalog.categories.map((category) => ({
      id: category.id,
      label: category.label,
      summary: category.summary,
      color: CATEGORY_COLORS[category.id] || CATEGORY_COLORS.all,
      count: category.count,
      url: toUrl(categoryPath(category.id, locale)),
    })),
  ];

  const notes = catalog.notes.map((note) => buildClientNote(note));
  const fallbackNote = notes.find((note) => note.key === initialNoteKey) || notes[0];

  return {
    locale,
    initialCategory,
    initialNoteKey: fallbackNote?.key || "",
    initialView,
    categories,
    notes,
  };
}

function buildClientNote(note) {
  const variants = {};
  for (const locale of LOCALES) {
    const variant = getVariant(note, locale);
    variants[locale] = extractClientContent(note, variant, locale);
  }

  return {
    key: note.key,
    category: note.category,
    categoryLabel: categoryLabel(note.category),
    slug: note.slug,
    date: note.date,
    tags: note.tags,
    readTime: estimateReadTime(getVariant(note, DEFAULT_LOCALE).plainText),
    command: firstCommand(note),
    paths: [
      `content/labs/${note.category}/${note.slug}.ko.md`,
      `content/labs/${note.category}/${note.slug}.en.md`,
      `generated/index/${note.category}.json`,
    ],
    variants,
  };
}

function extractClientContent(note, variant, locale) {
  const takeaways = extractBullets(
    variant.body,
    locale === "ko"
      ? ["배운 점", "다시 볼 키워드", "다시 볼 포인트", "주의점"]
      : ["Takeaways", "Revisit", "Caveats"],
  );
  const context = extractSectionText(
    variant.body,
    locale === "ko"
      ? ["실습 목표", "핵심 아이디어", "핵심 흐름", "한 줄 결론", "한 줄 모델", "목표"]
      : ["Goal", "Core Idea", "Core Flow", "One-line Model"],
  );
  const commands = extractSectionText(
    variant.body,
    locale === "ko"
      ? ["관찰한 증상", "관찰 신호", "관찰 포인트", "확인할 파일", "확인 및 수정 패턴", "최소 명령"]
      : ["Symptoms", "Observed Signals", "What to Observe", "Unit Files", "Verification and Fix Pattern", "Minimal Commands"],
  );
  const next = locale === "ko"
    ? "다음 노트는 같은 카테고리의 인접 개념으로 연결합니다. 실습을 반복할수록 명령어, 실패 조건, 원인 가설을 같은 포맷으로 남기는 것이 목표입니다."
    : "Connect the next note to an adjacent concept in the same category. The archive works best when commands, failure conditions, and hypotheses stay in a consistent format.";

  return {
    locale,
    title: variant.frontmatter.title || note.title,
    summary: variant.frontmatter.description || variant.excerpt || note.description,
    source: variant.frontmatter.source || note.source || "",
    html: variant.html,
    text: variant.plainText,
    points: normalizeLearningPoints(takeaways, variant, locale),
    context: context || variant.excerpt || note.description,
    commands: commands || (locale === "ko" ? "재현 가능한 명령어와 관찰 결과를 함께 기록합니다." : "Keep reproducible commands together with the observations."),
    publish:
      locale === "ko"
        ? "카테고리는 URL과 탐색의 기준입니다. 별도 작성 화면을 거치지 않고 repo에 Markdown을 올리면 빌드 단계에서 카테고리와 한/영 쌍을 자동으로 인덱싱합니다."
        : "Categories drive URLs and navigation. The archive does not require a manual new-note action; Markdown pushed to the repository is indexed during the build and paired by language slug.",
    next,
    url: toUrl(notePath(note, variant.locale)),
  };
}

function normalizeLearningPoints(points, variant, locale) {
  const cleaned = points.map((point) => point.replace(/^[\s-]+/, "").trim()).filter(Boolean).slice(0, 3);
  while (cleaned.length < 3) {
    const fallback = locale === "ko"
      ? ["문제 증상과 확인 명령을 분리해서 기록합니다.", "실습 환경이 사라져도 판단 기준이 남도록 씁니다.", "한/영 파일은 같은 slug로 유지합니다."]
      : ["Separate symptoms from inspection commands.", "Keep the decision criteria even after the lab environment disappears.", "Keep Korean and English files on the same slug."];
    cleaned.push(fallback[cleaned.length]);
  }
  return cleaned.map((point, index) => ({
    title: learningTitle(index, locale),
    body: point || variant.excerpt,
  }));
}

function learningTitle(index, locale) {
  const ko = ["관찰 단위", "디버깅 흐름", "재방문 포인트"];
  const en = ["Observation unit", "Debugging flow", "Revisit point"];
  return (locale === "ko" ? ko : en)[index] || (locale === "ko" ? "메모" : "Note");
}

function firstCommand(note) {
  for (const locale of LOCALES) {
    const variant = note.variants[locale];
    if (variant?.codeBlocks?.[0]) return variant.codeBlocks[0];
  }
  return `# Add commands to content/labs/${note.category}/${note.slug}.ko.md`;
}

function estimateReadTime(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(3, Math.ceil(words / 180))} min`;
}

function extractBullets(body, headingNames) {
  const section = extractSectionRaw(body, headingNames);
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1] || "")
    .filter(Boolean);
}

function extractSectionText(body, headingNames) {
  const section = extractSectionRaw(body, headingNames);
  if (!section) return "";
  return section
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("```"))
    .filter((line) => !/^\s*[-*]\s+/.test(line))
    .filter((line) => !/^\s*\d+\.\s+/.test(line))
    .filter((line) => !line.match(/^\s*#{1,6}\s+/))
    .map((line) => stripInline(line.trim()))
    .filter(Boolean)
    .join(" ");
}

function extractSectionRaw(body, headingNames) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let inSection = false;
  const collected = [];
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      const text = stripInline(heading[1].trim()).toLowerCase();
      if (headingNames.some((name) => text === name.toLowerCase())) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) collected.push(line);
  }
  return collected.join("\n").trim();
}

function generateSitemap(paths) {
  if (!SITE_URL) return;
  const urls = paths
    .map(
      (urlPath) => `
  <url>
    <loc>${absoluteUrl(urlPath)}</loc>
  </url>`,
    )
    .join("");
  writeText(
    path.join(DIST_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`,
  );
}

function main() {
  emptyDir(DIST_DIR);
  copyStaticAssets();
  const catalog = buildCatalog();
  const generatedPaths = ["/"];

  writeText(
    path.join(DIST_DIR, "index.html"),
    renderTilAppPage(catalog, DEFAULT_LOCALE, {
      title: "TIL Archive",
      localeLinks: { ko: localeHome("ko"), en: localeHome("en") },
    }),
  );

  for (const locale of LOCALES) {
    writeText(
      path.join(DIST_DIR, locale, "index.html"),
      renderTilAppPage(catalog, locale, {
        title: "TIL Archive",
        localeLinks: { ko: localeHome("ko"), en: localeHome("en") },
      }),
    );
    generatedPaths.push(localeHome(locale));

    for (const category of catalog.categories) {
      writeText(
        path.join(DIST_DIR, locale, "categories", category.id, "index.html"),
        renderTilAppPage(catalog, locale, {
          title: `${category.label} · TIL Archive`,
          description: category.summary,
          initialCategory: category.id,
          initialNoteKey: catalog.notes.find((note) => note.category === category.id)?.key,
          localeLinks: {
            ko: categoryPath(category.id, "ko"),
            en: categoryPath(category.id, "en"),
          },
        }),
      );
      generatedPaths.push(categoryPath(category.id, locale));
    }
  }

  for (const category of catalog.categories) {
    const index = catalog.notes
      .filter((note) => note.category === category.id)
      .map((note) => ({
        slug: note.slug,
        title: note.title,
        category: note.category,
        date: note.date,
        tags: note.tags,
        variants: Object.keys(note.variants).sort(),
      }));
    writeText(
      path.join(DIST_DIR, "generated", "index", `${category.id}.json`),
      `${JSON.stringify(index, null, 2)}\n`,
    );
  }

  for (const note of catalog.notes) {
    for (const locale of Object.keys(note.variants)) {
      const variant = getVariant(note, locale);
      writeText(
        path.join(DIST_DIR, locale, "labs", note.category, note.slug, "index.html"),
        renderTilAppPage(catalog, locale, {
          title: `${variant.frontmatter.title || note.title} · TIL Archive`,
          description: variant.frontmatter.description || note.description,
          initialCategory: note.category,
          initialNoteKey: note.key,
          initialView: "article",
          localeLinks: {
            ko: note.variants.ko ? notePath(note, "ko") : "",
            en: note.variants.en ? notePath(note, "en") : "",
          },
        }),
      );
      generatedPaths.push(notePath(note, locale));
    }
  }

  writeText(
    path.join(DIST_DIR, "robots.txt"),
    `User-agent: *
Allow: /
${SITE_URL ? `Sitemap: ${absoluteUrl("/sitemap.xml")}\n` : ""}`,
  );
  generateSitemap(generatedPaths);
  console.log(`Built ${catalog.notes.length} notes, ${catalog.categories.length} categories into ${DIST_DIR}`);
}

main();
