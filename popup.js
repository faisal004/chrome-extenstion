const DEFAULT_CATEGORY = "Uncategorized";
const ALL_CATEGORIES = "__all__";
const DEFAULT_CATEGORIES = [DEFAULT_CATEGORY, "Research", "Ideas", "To Read", "Quotes"];
const GEMINI_MODEL = "gemini-3.5-flash";

const highlightList = document.getElementById("highlightList");
const highlightTemplate = document.getElementById("highlightTemplate");
const highlightCount = document.getElementById("highlightCount");
const clearAllButton = document.getElementById("clearAllButton");
const categoryChips = document.getElementById("categoryChips");
const highlightsPanel = document.getElementById("highlightsPanel");
const summaryPanel = document.getElementById("summaryPanel");
const tabButtons = document.querySelectorAll(".tab-button");
const summaryCategorySelect = document.getElementById("summaryCategorySelect");
const summaryCount = document.getElementById("summaryCount");
const summaryPreview = document.getElementById("summaryPreview");
const summarizeButton = document.getElementById("summarizeButton");
const summaryStatus = document.getElementById("summaryStatus");
const summaryOutput = document.getElementById("summaryOutput");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyButton = document.getElementById("saveApiKeyButton");

let highlights = [];
let categories = [...DEFAULT_CATEGORIES];
let activeCategoryFilter = ALL_CATEGORIES;
let summaryCategory = ALL_CATEGORIES;

async function getStoredData() {
  return chrome.storage.local.get({
    highlights: [],
    categories: DEFAULT_CATEGORIES,
    geminiApiKey: "",
  });
}

async function setHighlights(nextHighlights) {
  highlights = nextHighlights;
  await chrome.storage.local.set({ highlights });
  renderPopup();
}

function normalizeCategories(storedCategories) {
  const mergedCategories = [DEFAULT_CATEGORY, ...storedCategories, ...DEFAULT_CATEGORIES];
  return [...new Set(mergedCategories.filter(Boolean))];
}

function getHighlightCategory(highlight) {
  return highlight.category || DEFAULT_CATEGORY;
}

function getFilteredHighlights() {
  if (activeCategoryFilter === ALL_CATEGORIES) {
    return highlights;
  }

  return highlights.filter((highlight) => getHighlightCategory(highlight) === activeCategoryFilter);
}

function getSummaryHighlights() {
  if (summaryCategory === ALL_CATEGORIES) {
    return highlights;
  }

  return highlights.filter((highlight) => getHighlightCategory(highlight) === summaryCategory);
}

function getCategoryLabel(category) {
  return category === ALL_CATEGORIES ? "All highlights" : category;
}

function getCategoryCount(category) {
  if (category === ALL_CATEGORIES) {
    return highlights.length;
  }

  return highlights.filter((highlight) => getHighlightCategory(highlight) === category).length;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function updateCount() {
  const totalCount = highlights.length;
  const visibleCount = getFilteredHighlights().length;

  if (activeCategoryFilter === ALL_CATEGORIES) {
    highlightCount.textContent = totalCount === 1 ? "1 highlight saved" : `${totalCount} highlights saved`;
  } else {
    highlightCount.textContent = `${visibleCount} in ${activeCategoryFilter}`;
  }

  clearAllButton.disabled = totalCount === 0;
}

function renderPopup() {
  renderCategoryChips();
  renderHighlights();
  renderSummaryControls();
}

function renderCategoryChips() {
  categoryChips.textContent = "";

  const filterCategories = [ALL_CATEGORIES, ...categories];
  const fragment = document.createDocumentFragment();

  for (const category of filterCategories) {
    const button = document.createElement("button");
    const count = getCategoryCount(category);

    button.type = "button";
    button.className = "category-chip";
    button.textContent = `${getCategoryLabel(category)} ${count}`;
    button.dataset.category = category;
    button.setAttribute("aria-pressed", String(category === activeCategoryFilter));

    if (category === activeCategoryFilter) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      activeCategoryFilter = category;
      renderPopup();
    });

    fragment.appendChild(button);
  }

  categoryChips.appendChild(fragment);
}

function renderEmptyState() {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  if (highlights.length === 0) {
    emptyState.textContent = 'Select text on any webpage, then click "Save Highlight?" to store it here.';
  } else {
    emptyState.textContent = `No highlights in ${activeCategoryFilter} yet.`;
  }

  highlightList.appendChild(emptyState);
}

function renderHighlights() {
  const visibleHighlights = getFilteredHighlights();
  highlightList.textContent = "";
  updateCount();

  if (visibleHighlights.length === 0) {
    renderEmptyState();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const highlight of visibleHighlights) {
    const item = highlightTemplate.content.firstElementChild.cloneNode(true);
    const text = item.querySelector(".highlight-text");
    const source = item.querySelector(".highlight-source");
    const date = item.querySelector(".highlight-date");
    const categorySelect = item.querySelector(".highlight-category");
    const deleteButton = item.querySelector(".delete-button");

    text.textContent = highlight.text;
    source.href = highlight.url;
    source.textContent = highlight.title || highlight.url;
    source.title = highlight.url;
    date.dateTime = highlight.createdAt;
    date.textContent = formatDate(highlight.createdAt);
    populateCategorySelect(categorySelect, getHighlightCategory(highlight));

    categorySelect.addEventListener("change", async () => {
      await updateHighlightCategory(highlight.id, categorySelect.value);
      clearSummaryOutput();
      summaryStatus.textContent = "Category updated.";
    });

    deleteButton.addEventListener("click", async () => {
      await setHighlights(highlights.filter((itemHighlight) => itemHighlight.id !== highlight.id));
      clearSummaryOutput();
      summaryStatus.textContent = "Highlight deleted.";
    });

    fragment.appendChild(item);
  }

  highlightList.appendChild(fragment);
}

function populateCategorySelect(selectElement, selectedCategory) {
  selectElement.textContent = "";

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === selectedCategory;
    selectElement.appendChild(option);
  }
}

async function updateHighlightCategory(highlightId, category) {
  await setHighlights(
    highlights.map((highlight) => {
      if (highlight.id !== highlightId) {
        return highlight;
      }

      return { ...highlight, category };
    })
  );
}

function renderSummaryControls() {
  const selectedHighlights = getSummaryHighlights();
  summaryCategorySelect.textContent = "";

  for (const category of [ALL_CATEGORIES, ...categories]) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = getCategoryLabel(category);
    option.selected = category === summaryCategory;
    summaryCategorySelect.appendChild(option);
  }

  summaryCount.textContent =
    selectedHighlights.length === 1
      ? `1 highlight selected from ${getCategoryLabel(summaryCategory)}`
      : `${selectedHighlights.length} highlights selected from ${getCategoryLabel(summaryCategory)}`;

  summarizeButton.disabled = selectedHighlights.length === 0;
  renderSummaryPreview(selectedHighlights);
}

function renderSummaryPreview(selectedHighlights) {
  summaryPreview.textContent = "";

  if (selectedHighlights.length === 0) {
    summaryPreview.textContent = "No highlights in this category yet.";
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const highlight of selectedHighlights.slice(0, 2)) {
    const preview = document.createElement("p");
    preview.textContent = highlight.text;
    fragment.appendChild(preview);
  }

  summaryPreview.appendChild(fragment);
}

async function initializePopup() {
  const storedData = await getStoredData();
  categories = normalizeCategories(storedData.categories);
  highlights = storedData.highlights;
  apiKeyInput.value = storedData.geminiApiKey;

  await chrome.storage.local.set({ categories });
  renderPopup();
}

async function saveApiKey() {
  const geminiApiKey = apiKeyInput.value.trim();
  await chrome.storage.local.set({ geminiApiKey });
  summaryStatus.textContent = geminiApiKey ? "Gemini API key saved locally." : "Gemini API key removed.";
}

function buildSummaryPrompt(selectedHighlights, selectedCategory) {
  const text = selectedHighlights
    .map((highlight, index) => `${index + 1}. ${highlight.text}`)
    .join("\n\n");

  return `Summarize these saved webpage highlights from "${getCategoryLabel(selectedCategory)}" as MDX-compatible Markdown. Use a short heading and 4 concise bullet points or fewer. Do not include JSX components or HTML tags.\n\n${text}`;
}

function clearSummaryOutput() {
  summaryOutput.textContent = "";
}

function renderMdxSummary(markdown) {
  clearSummaryOutput();

  if (!markdown) {
    summaryOutput.textContent = "Gemini returned an empty summary.";
    return;
  }

  const lines = markdown.split(/\r?\n/);
  let list = null;
  let codeBlock = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const codeFenceMatch = line.match(/^```/);

    if (codeFenceMatch) {
      if (codeBlock) {
        summaryOutput.appendChild(codeBlock);
        codeBlock = null;
      } else {
        codeBlock = document.createElement("pre");
      }
      list = null;
      continue;
    }

    if (codeBlock) {
      codeBlock.textContent += `${line}\n`;
      continue;
    }

    if (!line.trim()) {
      list = null;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      list = null;
      const heading = document.createElement(`h${headingMatch[1].length + 2}`);
      heading.appendChild(renderInlineMdx(headingMatch[2]));
      summaryOutput.appendChild(heading);
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!list) {
        list = document.createElement("ul");
        summaryOutput.appendChild(list);
      }

      const item = document.createElement("li");
      item.appendChild(renderInlineMdx(listMatch[1]));
      list.appendChild(item);
      continue;
    }

    list = null;
    const paragraph = document.createElement("p");
    paragraph.appendChild(renderInlineMdx(line));
    summaryOutput.appendChild(paragraph);
  }

  if (codeBlock) {
    summaryOutput.appendChild(codeBlock);
  }
}

function renderInlineMdx(text) {
  const fragment = document.createDocumentFragment();
  const tokenPattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match = tokenPattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (match[2] && match[3]) {
      const link = document.createElement("a");
      link.href = match[3];
      link.textContent = match[2];
      link.target = "_blank";
      link.rel = "noreferrer";
      fragment.appendChild(link);
    } else if (match[4]) {
      const code = document.createElement("code");
      code.textContent = match[4];
      fragment.appendChild(code);
    } else if (match[5]) {
      const strong = document.createElement("strong");
      strong.textContent = match[5];
      fragment.appendChild(strong);
    }

    lastIndex = tokenPattern.lastIndex;
    match = tokenPattern.exec(text);
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}

async function summarizeHighlights() {
  const selectedHighlights = getSummaryHighlights();
  clearSummaryOutput();

  if (selectedHighlights.length === 0) {
    summaryStatus.textContent = "Choose a category with saved highlights first.";
    return;
  }

  const { geminiApiKey } = await getStoredData();

  if (!geminiApiKey) {
    summaryStatus.textContent = "Add and save a Gemini API key first.";
    apiKeyInput.focus();
    return;
  }

  summaryStatus.textContent = "Summarizing...";
  summarizeButton.disabled = true;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildSummaryPrompt(selectedHighlights, summaryCategory) }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();

    renderMdxSummary(summary);
    summaryStatus.textContent = "Summary ready.";
  } catch (error) {
    summaryStatus.textContent = error instanceof Error ? error.message : "Could not summarize highlights.";
  } finally {
    summarizeButton.disabled = getSummaryHighlights().length === 0;
  }
}

function setActiveTab(tabName) {
  const isSummaryTab = tabName === "summary";

  highlightsPanel.hidden = isSummaryTab;
  summaryPanel.hidden = !isSummaryTab;
  highlightsPanel.classList.toggle("active-panel", !isSummaryTab);
  summaryPanel.classList.toggle("active-panel", isSummaryTab);

  for (const button of tabButtons) {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

summaryCategorySelect.addEventListener("change", () => {
  summaryCategory = summaryCategorySelect.value;
  clearSummaryOutput();
  summaryStatus.textContent = "";
  renderSummaryControls();
});

clearAllButton.addEventListener("click", async () => {
  await setHighlights([]);
  clearSummaryOutput();
  summaryStatus.textContent = "All highlights cleared.";
});

saveApiKeyButton.addEventListener("click", saveApiKey);
summarizeButton.addEventListener("click", summarizeHighlights);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.highlights) {
    return;
  }

  highlights = changes.highlights.newValue || [];
  renderPopup();
});

initializePopup();
