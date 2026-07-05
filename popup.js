const highlightList = document.getElementById("highlightList");
const highlightTemplate = document.getElementById("highlightTemplate");
const highlightCount = document.getElementById("highlightCount");
const clearAllButton = document.getElementById("clearAllButton");
const summarizeButton = document.getElementById("summarizeButton");
const summaryStatus = document.getElementById("summaryStatus");
const summaryOutput = document.getElementById("summaryOutput");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyButton = document.getElementById("saveApiKeyButton");

let highlights = [];

async function getStoredData() {
  return chrome.storage.local.get({
    highlights: [],
    geminiApiKey: "",
  });
}

async function setHighlights(nextHighlights) {
  highlights = nextHighlights;
  await chrome.storage.local.set({ highlights });
  renderHighlights();
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function updateCount() {
  const count = highlights.length;
  highlightCount.textContent = count === 1 ? "1 highlight saved" : `${count} highlights saved`;
  clearAllButton.disabled = count === 0;
  summarizeButton.disabled = count === 0;
}

function renderEmptyState() {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = 'Select text on any webpage, then click "Save Highlight?" to store it here.';
  highlightList.appendChild(emptyState);
}

function renderHighlights() {
  highlightList.textContent = "";
  updateCount();

  if (highlights.length === 0) {
    renderEmptyState();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const highlight of highlights) {
    const item = highlightTemplate.content.firstElementChild.cloneNode(true);
    const text = item.querySelector(".highlight-text");
    const source = item.querySelector(".highlight-source");
    const date = item.querySelector(".highlight-date");
    const deleteButton = item.querySelector(".delete-button");

    text.textContent = highlight.text;
    source.href = highlight.url;
    source.textContent = highlight.title || highlight.url;
    source.title = highlight.url;
    date.dateTime = highlight.createdAt;
    date.textContent = formatDate(highlight.createdAt);

    deleteButton.addEventListener("click", async () => {
      await setHighlights(highlights.filter((itemHighlight) => itemHighlight.id !== highlight.id));
      summaryOutput.textContent = "";
      summaryStatus.textContent = "Highlight deleted.";
    });

    fragment.appendChild(item);
  }

  highlightList.appendChild(fragment);
}

async function initializePopup() {
  const storedData = await getStoredData();
  highlights = storedData.highlights;
  apiKeyInput.value = storedData.geminiApiKey;
  renderHighlights();
}

async function saveApiKey() {
  const geminiApiKey = apiKeyInput.value.trim();
  await chrome.storage.local.set({ geminiApiKey });
  summaryStatus.textContent = geminiApiKey ? "Gemini API key saved locally." : "Gemini API key removed.";
}

function buildSummaryPrompt() {
  const text = highlights
    .map((highlight, index) => `${index + 1}. ${highlight.text}`)
    .join("\n\n");

  return `Summarize these saved webpage highlights in 4 concise bullet points or fewer:\n\n${text}`;
}

async function summarizeHighlights() {
  summaryOutput.textContent = "";

  if (highlights.length === 0) {
    summaryStatus.textContent = "Save at least one highlight first.";
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildSummaryPrompt() }],
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

    summaryOutput.textContent = summary || "Gemini returned an empty summary.";
    summaryStatus.textContent = "Summary ready.";
  } catch (error) {
    summaryStatus.textContent = error instanceof Error ? error.message : "Could not summarize highlights.";
  } finally {
    summarizeButton.disabled = highlights.length === 0;
  }
}

clearAllButton.addEventListener("click", async () => {
  await setHighlights([]);
  summaryOutput.textContent = "";
  summaryStatus.textContent = "All highlights cleared.";
});

saveApiKeyButton.addEventListener("click", saveApiKey);
summarizeButton.addEventListener("click", summarizeHighlights);

initializePopup();
