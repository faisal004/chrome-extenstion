(function () {
  const POPUP_ID = "website-highlight-saver-popup";
  let selectedText = "";
  let selectionRect = null;
  let isSaving = false;

  function removeSavePopup() {
    const existingPopup = document.getElementById(POPUP_ID);
    if (existingPopup) {
      existingPopup.remove();
    }
  }

  function isSavePopupTarget(target) {
    return target instanceof Element && Boolean(target.closest(`#${POPUP_ID}`));
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

  function showSavePopup(text, rect) {
    removeSavePopup();

    const popup = document.createElement("button");
    popup.id = POPUP_ID;
    popup.type = "button";
    popup.textContent = "Save Highlight?";
    popup.dataset.highlightText = text;
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

    popup.addEventListener("pointerdown", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isSaving) {
        return;
      }

      try {
        isSaving = true;
        popup.textContent = "Saving...";
        await saveHighlight(popup.dataset.highlightText || selectedText);
        popup.textContent = "Saved";
        setTimeout(removeSavePopup, 900);
      } catch (error) {
        popup.textContent = "Could not save";
        setTimeout(removeSavePopup, 1400);
      } finally {
        isSaving = false;
      }
    });

    popup.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    document.documentElement.appendChild(popup);
  }

  async function saveHighlight(textToSave) {
    const text = String(textToSave || "").trim();

    if (!text) {
      throw new Error("No selected text to save.");
    }

    const highlight = {
      id: createHighlightId(),
      text,
      url: window.location.href,
      title: document.title || window.location.hostname,
      category: "Uncategorized",
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
    showSavePopup(selectedText, selectionRect);
  }

  document.addEventListener(
    "mouseup",
    (event) => {
      if (isSavePopupTarget(event.target)) {
        return;
      }

      setTimeout(handleSelectionChange, 0);
    },
    true
  );

  document.addEventListener("pointerup", (event) => {
    if (isSavePopupTarget(event.target)) {
      return;
    }

    setTimeout(handleSelectionChange, 0);
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift" || event.key.startsWith("Arrow")) {
      setTimeout(handleSelectionChange, 0);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (isSavePopupTarget(event.target)) {
      return;
    }

    removeSavePopup();
  });

  window.addEventListener("scroll", removeSavePopup, { passive: true });
})();
