(() => {
  const archive = window.__TIL_ARCHIVE__;
  if (!archive) return;

  const state = {
    category: archive.initialCategory || "all",
    noteKey: archive.initialNoteKey || archive.notes[0]?.key || "",
    lang: archive.locale || "ko",
    query: "",
    view: archive.initialView || "category",
  };

  const els = {
    categoryList: document.getElementById("categoryList"),
    noteList: document.getElementById("noteList"),
    mobileNoteList: document.getElementById("mobileNoteList"),
    emptyState: document.getElementById("emptyState"),
    searchInput: document.getElementById("searchInput"),
    article: document.getElementById("article"),
    articleCategory: document.getElementById("articleCategory"),
    articleDate: document.getElementById("articleDate"),
    articleTitle: document.getElementById("articleTitle"),
    articleSummary: document.getElementById("articleSummary"),
    categoryResults: document.getElementById("categoryResults"),
    categoryResultsTitle: document.getElementById("categoryResultsTitle"),
    categoryResultsSummary: document.getElementById("categoryResultsSummary"),
    categoryResultsCount: document.getElementById("categoryResultsCount"),
    categoryCardGrid: document.getElementById("categoryCardGrid"),
    categoryEmptyState: document.getElementById("categoryEmptyState"),
    sourceLink: document.getElementById("sourceLink"),
    readTime: document.getElementById("readTime"),
    learningList: document.getElementById("learningList"),
    contextBody: document.getElementById("contextBody"),
    commandsBody: document.getElementById("commandsBody"),
    publishBody: document.getElementById("publishBody"),
    nextBody: document.getElementById("nextBody"),
    commandBlock: document.getElementById("commandBlock"),
    fullNoteBody: document.getElementById("fullNoteBody"),
    pathList: document.getElementById("pathList"),
    tocNav: document.getElementById("tocNav"),
    themeToggle: document.getElementById("themeToggle"),
    copyCommand: document.getElementById("copyCommand"),
  };

  function getCategory(id) {
    return archive.categories.find((category) => category.id === id) || archive.categories[0];
  }

  function getNote(key) {
    return archive.notes.find((note) => note.key === key) || archive.notes[0];
  }

  function getContent(note) {
    return note.variants[state.lang] || note.variants.ko || note.variants.en;
  }

  function noteMatches(note) {
    const contentKo = note.variants.ko || {};
    const contentEn = note.variants.en || {};
    const text = [
      note.category,
      note.categoryLabel,
      note.slug,
      ...(note.tags || []),
      note.command,
      contentKo.title,
      contentKo.summary,
      contentKo.context,
      contentKo.commands,
      contentKo.text,
      ...(contentKo.points || []).flatMap((point) => [point.title, point.body]),
      contentEn.title,
      contentEn.summary,
      contentEn.context,
      contentEn.commands,
      contentEn.text,
      ...(contentEn.points || []).flatMap((point) => [point.title, point.body]),
    ]
      .join(" ")
      .toLowerCase();
    const categoryOk = state.category === "all" || note.category === state.category;
    const queryOk = !state.query || text.includes(state.query.toLowerCase());
    return categoryOk && queryOk;
  }

  function renderCategories() {
    els.categoryList.innerHTML = "";
    for (const category of archive.categories) {
      const count = category.id === "all"
        ? archive.notes.length
        : archive.notes.filter((note) => note.category === category.id).length;
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-button ${state.category === category.id ? "active" : ""}`;
      button.style.setProperty("--cat", category.color);
      button.innerHTML = `<span class="cat-color"></span><span>${escapeHtml(category.label)}</span><span class="count">${count}</span>`;
      button.addEventListener("click", () => {
        state.category = category.id;
        state.view = "category";
        render();
        if (category.url) history.replaceState(null, "", category.url);
      });
      li.append(button);
      els.categoryList.append(li);
    }
  }

  function renderNoteList(target) {
    const filtered = archive.notes.filter(noteMatches);
    target.innerHTML = "";
    for (const note of filtered) {
      const content = getContent(note);
      const category = getCategory(note.category);
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `note-button ${state.noteKey === note.key ? "active" : ""}`;
      button.innerHTML = `
        <span>
          <span class="note-title">${escapeHtml(content.title)}</span>
          <span class="note-meta">${escapeHtml(note.date || "")} · ${escapeHtml(category.label)}</span>
        </span>
        <span class="lang-pair">KO/EN</span>
      `;
      button.addEventListener("click", () => {
        openNote(note);
      });
      li.append(button);
      target.append(li);
    }
    els.emptyState.classList.toggle("visible", filtered.length === 0);
  }

  function renderNoteLists() {
    renderNoteList(els.noteList);
    renderNoteList(els.mobileNoteList);
  }

  function renderArticle() {
    const note = getNote(state.noteKey);
    if (!note) return;
    const content = getContent(note);
    const category = getCategory(note.category);

    els.categoryResults.hidden = true;
    els.article.hidden = false;
    document.documentElement.lang = state.lang;
    els.articleCategory.textContent = category.label;
    els.articleDate.textContent = note.date || "";
    els.articleTitle.textContent = content.title || "";
    els.articleSummary.textContent = content.summary || "";
    renderSourceLink(content.source);
    els.readTime.textContent = note.readTime || "";
    renderParagraph(els.contextBody, content.context);
    renderParagraph(els.commandsBody, content.commands);
    renderParagraph(els.publishBody, content.publish);
    renderParagraph(els.nextBody, content.next);
    els.commandBlock.textContent = note.command || "";
    if (els.fullNoteBody) {
      els.fullNoteBody.innerHTML = content.html || "";
    }

    els.learningList.innerHTML = "";
    for (const point of content.points || []) {
      const li = document.createElement("li");
      li.className = "learning-card";
      li.innerHTML = `<strong>${escapeHtml(point.title)}</strong><p>${escapeHtml(point.body)}</p>`;
      els.learningList.append(li);
    }

    els.pathList.innerHTML = "";
    for (const filePath of note.paths || []) {
      const li = document.createElement("li");
      li.innerHTML = `<code>${escapeHtml(filePath)}</code>`;
      els.pathList.append(li);
    }

    for (const link of document.querySelectorAll("[data-lang]")) {
      link.classList.toggle("active", link.dataset.lang === state.lang);
    }
  }

  function renderCategoryResults() {
    const category = getCategory(state.category);
    const filtered = archive.notes.filter(noteMatches);
    const title = state.query
      ? (state.lang === "ko" ? "검색 결과" : "Search results")
      : category.label;
    const noteLabel = state.lang === "ko" ? "개 글" : "notes";

    els.article.hidden = true;
    els.categoryResults.hidden = false;
    els.categoryResultsTitle.textContent = title;
    els.categoryResultsSummary.textContent = category.summary || "";
    els.categoryResultsCount.textContent = `${filtered.length} ${noteLabel}`;
    els.categoryCardGrid.innerHTML = "";

    for (const note of filtered) {
      const content = getContent(note);
      const noteCategory = getCategory(note.category);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-card";
      button.dataset.noteKey = note.key;
      button.innerHTML = `
        <span class="result-card-top">
          <span>${escapeHtml(noteCategory.label)}</span>
          <span>${escapeHtml(note.date || "")}</span>
        </span>
        <strong>${escapeHtml(content.title || "")}</strong>
        <span class="result-summary">${escapeHtml(content.summary || "")}</span>
        <span class="tag-row">${(note.tags || []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</span>
      `;
      button.addEventListener("click", () => {
        openNote(note);
      });
      els.categoryCardGrid.append(button);
    }

    els.categoryEmptyState.classList.toggle("visible", filtered.length === 0);

    for (const link of document.querySelectorAll("[data-lang]")) {
      link.classList.toggle("active", link.dataset.lang === state.lang);
    }
  }

  function renderToc() {
    if (!els.tocNav) return;
    if (state.view === "category") {
      els.tocNav.innerHTML = `
        <a class="toc-link" href="#categoryResults">${state.lang === "ko" ? "글 목록" : "Note list"}</a>
      `;
      return;
    }
    els.tocNav.innerHTML = `
      <a class="toc-link" href="#context">${state.lang === "ko" ? "실습 맥락" : "Lab context"}</a>
      <a class="toc-link" href="#commands">${state.lang === "ko" ? "기록할 명령어" : "Commands"}</a>
      <a class="toc-link" href="#publish">${state.lang === "ko" ? "GitHub 자동 렌더링" : "GitHub rendering"}</a>
      <a class="toc-link" href="#next">${state.lang === "ko" ? "다음 노트" : "Next notes"}</a>
      <a class="toc-link" href="#full-note">${state.lang === "ko" ? "전체 정리" : "Full note"}</a>
    `;
  }

  function openNote(note) {
    const content = getContent(note);
    state.noteKey = note.key;
    state.view = "article";
    render();
    history.replaceState(null, "", content.url);
  }

  function renderParagraph(target, text) {
    target.innerHTML = `<p>${escapeHtml(text || "")}</p>`;
  }

  function renderSourceLink(source) {
    if (!els.sourceLink) return;
    if (!source) {
      els.sourceLink.hidden = true;
      els.sourceLink.removeAttribute("href");
      return;
    }
    els.sourceLink.hidden = false;
    els.sourceLink.href = source;
  }

  function render() {
    renderCategories();
    renderNoteLists();
    if (state.view === "category") {
      renderCategoryResults();
    } else {
      renderArticle();
    }
    renderToc();
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.view = "category";
    render();
  });

  els.copyCommand.addEventListener("click", async (event) => {
    await copyText(els.commandBlock.textContent);
    event.currentTarget.textContent = "copied";
    setTimeout(() => {
      event.currentTarget.textContent = "copy";
    }, 1100);
  });

  els.themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("diadia-theme", nextTheme);
  });

  render();
})();
