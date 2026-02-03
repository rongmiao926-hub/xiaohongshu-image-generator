# Xiaohongshu Text-Image Generator

A small web app that batches background images and copy, then renders centered text (5 characters per line) on each image with randomized fonts. It supports built-in templates, multi-upload, and ZIP export.

## Features
- Batch upload images and batch input copy (one line per image).
- Built-in template gallery with select all / clear / multi-select.
- Random font per image from a configurable font pool.
- Centered layout with automatic line breaks (5 chars per line).
- English words are kept intact (not split across lines).
- One-click ZIP export of all generated images.

## Quick Start
1. Open `index.html` in a browser.
2. Choose templates (optional) and/or upload background images.
3. Paste copy in the textarea (one line per image).
4. Click "Generate Preview".
5. Click "ZIP Export" to download all results.

## Matching Rules
- Templates are matched first, uploads are matched after.
- Copy lines are matched by order.
- If there are fewer copy lines than images, remaining images are left blank.

## Text Rules
- Line break every 5 characters.
- English words (A-Z, a-z, 0-9, hyphen, apostrophe) are kept intact.
- If a single English word is longer than 5 characters, it will occupy its own line.

## Fonts
- Fonts are loaded from Google Fonts via `index.html`.
- Edit the font pool in `app.js` to add or remove fonts.
- If the network is unavailable, the browser will fall back to system fonts.

## Templates
Built-in templates live in the `templates/` folder. The gallery is defined in `app.js` (see `templateLibrary`).

To add new templates:
1. Drop images into `templates/`.
2. Add entries to `templateLibrary` in `app.js`.

## Project Structure
- `index.html`: UI layout
- `styles.css`: Styling
- `app.js`: App logic (rendering, batching, ZIP export)
- `templates/`: Built-in background templates

## Notes
- ZIP export uses JSZip from a CDN (network required).
- If you want to work fully offline, host the page with a local server and replace CDN assets with local files.

