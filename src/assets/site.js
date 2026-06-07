(() => {
  const archive = window.__TIL_ARCHIVE__;
  if (!archive) return;

  const state = {
    category: archive.initialCategory || "all",
    noteKey: archive.initialNoteKey || archive.notes[0]?.key || "",
    lang: archive.locale || "ko",
    query: "",
  };

  const els = {
    categoryList: document.getElementById("categoryList"),
    noteList: document.getElementById("noteList"),
    mobileNoteList: document.getElementById("mobileNoteList"),
    emptyState: document.getElementById("emptyState"),
    searchInput: document.getElementById("searchInput"),
    articleCategory: document.getElementById("articleCategory"),
    articleDate: document.getElementById("articleDate"),
    articleTitle: document.getElementById("articleTitle"),
    articleSummary: document.getElementById("articleSummary"),
    readTime: document.getElementById("readTime"),
    learningList: document.getElementById("learningList"),
    contextBody: document.getElementById("contextBody"),
    commandsBody: document.getElementById("commandsBody"),
    publishBody: document.getElementById("publishBody"),
    nextBody: document.getElementById("nextBody"),
    commandBlock: document.getElementById("commandBlock"),
    pathList: document.getElementById("pathList"),
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
      ...(contentKo.points || []).flatMap((point) => [point.title, point.body]),
      contentEn.title,
      contentEn.summary,
      contentEn.context,
      contentEn.commands,
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
        const first = archive.notes.find(noteMatches);
        if (first) state.noteKey = first.key;
        render();
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
        state.noteKey = note.key;
        renderArticle();
        renderNoteLists();
        history.replaceState(null, "", content.url);
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

    document.documentElement.lang = state.lang;
    els.articleCategory.textContent = category.label;
    els.articleDate.textContent = note.date || "";
    els.articleTitle.textContent = content.title || "";
    els.articleSummary.textContent = content.summary || "";
    els.readTime.textContent = note.readTime || "";
    renderParagraph(els.contextBody, content.context);
    renderParagraph(els.commandsBody, content.commands);
    renderParagraph(els.publishBody, content.publish);
    renderParagraph(els.nextBody, content.next);
    els.commandBlock.textContent = note.command || "";

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

  function renderParagraph(target, text) {
    target.innerHTML = `<p>${escapeHtml(text || "")}</p>`;
  }

  function render() {
    renderCategories();
    renderNoteLists();
    renderArticle();
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
    const first = archive.notes.find(noteMatches);
    if (first) state.noteKey = first.key;
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
