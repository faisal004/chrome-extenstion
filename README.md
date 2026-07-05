# Website Highlight Saver

A lightweight Chrome extension for saving webpage highlights locally, organizing them by category, and summarizing selected groups with Gemini.

## Features

- Select text on any webpage and save it from the inline "Save Highlight?" prompt.
- View saved highlights from the Chrome toolbar popup.
- Filter highlights by category.
- Assign a category to each saved highlight.
- Delete individual highlights or clear all highlights.
- Summarize all highlights or one category with Gemini.

## Load in Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Visit any regular webpage, select text, and click "Save Highlight?".

Chrome does not run extensions on restricted pages such as `chrome://` URLs.

## Categories and summaries

New highlights start as `Uncategorized`. Open the extension popup to move them into `Research`, `Ideas`, `To Read`, or `Quotes`.

Use the `Highlights` tab to filter and organize saved text. Use the `Summary` tab to choose `All highlights` or a single category, then click Summarize.

Gemini summaries are optional. Paste your Gemini API key in the popup and click Save. The key is stored locally with `chrome.storage.local`, and the extension sends only the selected highlight text when you click Summarize.
