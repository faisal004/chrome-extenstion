(function () {
  const POPUP_ID = "website-highlight-saver-popup";
  let selectedText = "";
  let selectionRect = null;

  function removeSavePopup() {
    const existingPopup = document.getElementById(POPUP_ID);
    if (existingPopup) {
      existingPopup.remove();
    }
  }

  function getSelectionDetails() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const text = selection.toString().trim();

    if (!text) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }

    return { text, rect };
  }

  function showSavePopup(rect) {
    removeSavePopup();

    const popup = document.createElement("button");
    popup.id = POPUP_ID;
    popup.type = "button";
    popup.textContent = "Save Highlight?";
    popup.setAttribute("aria-label", "Save selected text as a highlight");

    const top = Math.max(8, rect.top + window.scrollY - 42);
    const left = Math.min(
      window.scrollX + document.documentElement.clientWidth - 150,
      Math.max(8, rect.left + window.scrollX + rect.width / 2 - 65)
    );

    Object.assign(popup.style, {
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: "2147483647",
      padding: "8px 12px",
      border: "0",
      borderRadius: "999px",
      background: "#1f2937",
      color: "#ffffff",
      cursor: "pointer",
      font: "13px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.22)",
    });

    popup.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    popup.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await saveHighlight();
      popup.textContent = "Saved";
      setTimeout(removeSavePopup, 900);
    });

    document.documentElement.appendChild(popup);
  }

  async function saveHighlight() {
    if (!selectedText) {
      return;
    }

    const highlight = {
      id: createHighlightId(),
      text: selectedText,
      url: window.location.href,
      title: document.title || window.location.hostname,
      createdAt: new Date().toISOString(),
    };

    const { highlights = [] } = await chrome.storage.local.get({ highlights: [] });
    await chrome.storage.local.set({ highlights: [highlight, ...highlights] });
  }

  function createHighlightId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function handleSelectionChange() {
    const details = getSelectionDetails();

    if (!details) {
      selectedText = "";
      selectionRect = null;
      removeSavePopup();
      return;
    }

    selectedText = details.text;
    selectionRect = details.rect;
    showSavePopup(selectionRect);
  }

  document.addEventListener("mouseup", () => {
    setTimeout(handleSelectionChange, 0);
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift" || event.key.startsWith("Arrow")) {
      setTimeout(handleSelectionChange, 0);
    }
  });

  document.addEventListener("mousedown", (event) => {
    const target = event.target;

    if (target instanceof Element && target.id === POPUP_ID) {
      return;
    }

    removeSavePopup();
  });

  window.addEventListener("scroll", removeSavePopup, { passive: true });
})();
