const bgInput = document.getElementById("bgInput");
const textInput = document.getElementById("textInput");
const generateBtn = document.getElementById("generateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const downloadBtn = document.getElementById("downloadBtn");
const fontLabel = document.getElementById("fontLabel");
const statusLine = document.getElementById("statusLine");
const previewGrid = document.getElementById("previewGrid");
const placeholder = document.getElementById("placeholder");
const templateGrid = document.getElementById("templateGrid");
const selectAllTemplatesBtn = document.getElementById("selectAllTemplates");
const clearTemplatesBtn = document.getElementById("clearTemplates");
const randomMatchInput = document.getElementById("randomMatch");
const zipLinkWrap = document.getElementById("zipLinkWrap");
const zipLink = document.getElementById("zipLink");

const fontPool = [];

const MAX_CANVAS_EDGE = 1600;
const LINE_CHAR_LIMIT = 7;

let entries = [];
const selectedTemplates = new Set();
const templateItemMap = new Map();
let currentZipUrl = null;

const templateLibrary = window.TEMPLATE_LIBRARY || [];

function pickRandomFont() {
  if (!fontPool.length) return "Apple Color Emoji";
  return fontPool[Math.floor(Math.random() * fontPool.length)];
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseLines(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function getSelectedTemplateList() {
  return templateLibrary.filter((template) => selectedTemplates.has(template.name));
}

function getUploadFiles() {
  return Array.from(bgInput.files || []);
}

function getSources() {
  const templates = getSelectedTemplateList().map((template) => ({
    type: "template",
    name: template.name,
    src: template.src,
  }));
  const uploads = getUploadFiles().map((file) => ({
    type: "file",
    name: file.name,
    file,
  }));
  return [...templates, ...uploads];
}

function refreshStatus() {
  const templateCount = getSelectedTemplateList().length;
  const uploadCount = getUploadFiles().length;
  const copyCount = parseLines(textInput.value).length;
  updateStatus(templateCount, uploadCount, copyCount);
}

function clearZipLink() {
  if (currentZipUrl) {
    URL.revokeObjectURL(currentZipUrl);
    currentZipUrl = null;
  }
  if (zipLinkWrap) {
    zipLinkWrap.hidden = true;
  }
  if (zipLink) {
    zipLink.href = "#";
  }
}

let graphemeSegmenter = null;

function splitGraphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    if (!graphemeSegmenter) {
      graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    }
    return Array.from(graphemeSegmenter.segment(text), (segment) => segment.segment);
  }
  return Array.from(text);
}

function graphemeLength(text) {
  return splitGraphemes(text).length;
}

function pushNonSpaceGraphemes(text, tokens) {
  for (const grapheme of splitGraphemes(text)) {
    if (!/\s/.test(grapheme)) {
      tokens.push(grapheme);
    }
  }
}

function tokenizeText(text) {
  const tokens = [];
  const wordRegex = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;
  let lastIndex = 0;
  let match = wordRegex.exec(text);
  while (match) {
    const index = match.index;
    if (index > lastIndex) {
      pushNonSpaceGraphemes(text.slice(lastIndex, index), tokens);
    }
    tokens.push(match[0]);
    lastIndex = index + match[0].length;
    match = wordRegex.exec(text);
  }
  if (lastIndex < text.length) {
    pushNonSpaceGraphemes(text.slice(lastIndex), tokens);
  }
  return tokens;
}

function isPunctuation(token) {
  if (graphemeLength(token) !== 1) return false;
  return /[,.!?;:、，。！？；：“”‘’（）《》〈〉【】〔〕（）·…—]/.test(token);
}

function chunkText(text) {
  const tokens = tokenizeText(text);
  const lines = [];
  let current = "";
  let count = 0;

  for (const token of tokens) {
    const punctuation = isPunctuation(token);
    const tokenLen = graphemeLength(token);
    if (count === 0 && punctuation && lines.length > 0) {
      lines[lines.length - 1] += token;
      continue;
    }
    if (count > 0 && count + tokenLen > LINE_CHAR_LIMIT) {
      if (punctuation) {
        current += token;
        count += tokenLen;
        lines.push(current);
        current = "";
        count = 0;
        continue;
      }
      lines.push(current);
      current = "";
      count = 0;
    }
    if (tokenLen > LINE_CHAR_LIMIT && count === 0) {
      lines.push(token);
      continue;
    }
    current += token;
    count += tokenLen;
  }

  if (current.length > 0 || lines.length === 0) {
    lines.push(current);
  }
  return lines;
}

function hasRenderableText(text) {
  return text.replace(/\s+/g, "").length > 0;
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function canvasToBlobSafe(canvas) {
  try {
    if (canvas.toBlob) {
      return await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          try {
            const dataUrl = canvas.toDataURL("image/png");
            resolve(dataUrlToBlob(dataUrl));
          } catch (error) {
            console.error(error);
            resolve(null);
          }
        }, "image/png");
      });
    }
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrlToBlob(dataUrl);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function fitCanvasToImage(canvas, img) {
  const maxEdge = Math.max(img.width, img.height);
  const scale = Math.min(1, MAX_CANVAS_EDGE / maxEdge);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  return scale;
}

function estimateFontSize(lines, canvas) {
  if (!lines.length) return { size: 42, lineHeight: 54 };
  const padding = canvas.width * 0.08;
  const maxLineWidth = canvas.width - padding * 2;
  let size = Math.floor(maxLineWidth / LINE_CHAR_LIMIT);
  size = Math.max(24, size);

  size = Math.max(18, Math.round(size * 0.7));
  let lineHeight = size * 1.3;
  let totalHeight = lines.length * lineHeight;
  const maxHeight = canvas.height * 0.78;

  if (totalHeight > maxHeight) {
    size = Math.floor(size * (maxHeight / totalHeight));
    size = Math.max(20, size);
    lineHeight = size * 1.3;
  }

  return { size, lineHeight };
}

async function renderEntry(entry) {
  const { canvas, ctx, image, text, font } = entry;
  const lines = chunkText(text);

  if (document.fonts?.load) {
    await document.fonts.load(`400 36px "${font}"`);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);

  const { size, lineHeight } = estimateFontSize(lines, canvas);
  const centerX = canvas.width / 2;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

  ctx.save();
  ctx.font = `400 ${size}px "${font}", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#413F3F";
  ctx.strokeStyle = "transparent";
  ctx.lineWidth = 0;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    if (line) {
      ctx.fillText(line, centerX, y);
    }
  });
  ctx.restore();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}

function loadImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

function loadImageFromSource(source) {
  if (source.type === "template") {
    return loadImageFromUrl(source.src);
  }
  return loadImageFromFile(source.file);
}

function updateFontLabel() {
  if (!entries.length) {
    fontLabel.textContent = "未生成";
    return;
  }
  const uniqueFonts = new Set(entries.map((entry) => entry.font));
  fontLabel.textContent = `已随机 ${uniqueFonts.size} 种字体`;
}

function updateStatus(templateCount, uploadCount, copyCount) {
  const imageCount = templateCount + uploadCount;
  if (!imageCount && !copyCount) {
    statusLine.textContent = "等待上传图片与文案";
    return;
  }
  const missing = Math.max(0, imageCount - copyCount);
  statusLine.textContent = `图片 ${imageCount} 张（模板 ${templateCount} / 上传 ${uploadCount}） · 文案 ${copyCount} 条`;
  if (missing > 0) {
    statusLine.textContent += ` · 缺少 ${missing} 条文案，已留空`;
  }
}

function setTemplateSelected(name, selected) {
  const item = templateItemMap.get(name);
  if (!item) return;
  item.classList.toggle("selected", selected);
  const check = item.querySelector(".check");
  if (check) {
    check.textContent = selected ? "✓" : "";
  }
}

function renderTemplateGrid() {
  if (!templateGrid) return;
  templateGrid.innerHTML = "";
  templateItemMap.clear();

  templateLibrary.forEach((template) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "template-item";
    item.title = template.name;

    const img = document.createElement("img");
    img.src = template.src;
    img.alt = template.name;

    const check = document.createElement("span");
    check.className = "check";

    item.appendChild(img);
    item.appendChild(check);

    item.addEventListener("click", () => {
      const isSelected = selectedTemplates.has(template.name);
      if (isSelected) {
        selectedTemplates.delete(template.name);
      } else {
        selectedTemplates.add(template.name);
      }
      setTemplateSelected(template.name, !isSelected);
      refreshStatus();
    });

    templateGrid.appendChild(item);
    templateItemMap.set(template.name, item);
    setTemplateSelected(template.name, selectedTemplates.has(template.name));
  });
}

function clearPreview() {
  previewGrid.innerHTML = "";
  placeholder.style.display = "grid";
  entries = [];
  updateFontLabel();
  refreshStatus();
  clearZipLink();
}

function createCard(entry, index) {
  const card = document.createElement("div");
  card.className = "preview-card";

  card.appendChild(entry.canvas);

  const caption = document.createElement("div");
  caption.className = "preview-caption";
  const nameSpan = document.createElement("span");
  nameSpan.textContent = entry.name || `image-${index + 1}`;
  const fontSpan = document.createElement("span");
  fontSpan.textContent = entry.font;
  caption.appendChild(nameSpan);
  caption.appendChild(fontSpan);

  card.appendChild(caption);
  entry.caption = fontSpan;

  return card;
}

async function buildEntries() {
  const sources = getSources();
  if (!sources.length) {
    alert("请先上传背景图或选择内置模板");
    return;
  }

  const lines = parseLines(textInput.value);
  if (!lines.length || !lines.some((line) => line.length > 0)) {
    alert("请先输入文案，每行一条");
    return;
  }

  const templateCount = getSelectedTemplateList().length;
  const uploadCount = getUploadFiles().length;
  updateStatus(templateCount, uploadCount, lines.length);
  previewGrid.innerHTML = "";
  placeholder.style.display = "none";
  clearZipLink();

  try {
    const shouldShuffle = randomMatchInput?.checked;
    const sourcesToUse = shouldShuffle ? shuffleArray(sources) : sources;
    const images = await Promise.all(sourcesToUse.map((source) => loadImageFromSource(source)));

    entries = sourcesToUse.map((source, index) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const image = images[index];
      fitCanvasToImage(canvas, image);

      const entry = {
        name: source.name,
        text: lines[index] ?? "",
        image,
        canvas,
        ctx,
        font: pickRandomFont(),
        caption: null,
      };

      return entry;
    });

    entries = entries.filter((entry) => hasRenderableText(entry.text));
    if (!entries.length) {
      previewGrid.innerHTML = "";
      placeholder.style.display = "grid";
      statusLine.textContent = "没有包含文字的图片可预览";
      updateFontLabel();
      clearZipLink();
      return;
    }

    entries.forEach((entry, index) => {
      const card = createCard(entry, index);
      previewGrid.appendChild(card);
    });

    for (const entry of entries) {
      await renderEntry(entry);
      if (entry.caption) {
        entry.caption.textContent = entry.font;
      }
    }

    updateFontLabel();
  } catch (error) {
    console.error(error);
    alert("图片加载失败，请重试");
  }
}

async function rerollFonts() {
  if (!entries.length) return;

  for (const entry of entries) {
    entry.font = pickRandomFont();
  }

  for (const entry of entries) {
    await renderEntry(entry);
    if (entry.caption) {
      entry.caption.textContent = entry.font;
    }
  }

  updateFontLabel();
}

function sanitizeBaseName(name) {
  const base = name.replace(/\.[^/.]+$/, "");
  return base.replace(/[^\w\u4e00-\u9fa5.-]+/g, "_");
}

async function downloadZip() {
  if (!entries.length) {
    alert("请先生成预览");
    return;
  }
  if (typeof JSZip === "undefined") {
    alert("ZIP 组件未加载，请检查网络后重试");
    return;
  }

  const entriesToExport = entries.filter((entry) => hasRenderableText(entry.text));
  if (!entriesToExport.length) {
    alert("没有包含文字的图片可下载");
    return;
  }

  try {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "打包中...";
    const zip = new JSZip();
    const folder = zip.folder("posters");

    const blobResults = await Promise.all(
      entriesToExport.map(async (entry) => ({
        name: entry.name,
        blob: await canvasToBlobSafe(entry.canvas),
      }))
    );

    const validResults = blobResults.filter((item) => item.blob);
    if (!validResults.length) {
      alert("图片导出失败，请稍后重试");
      return;
    }

    validResults.forEach((item, index) => {
      const baseName = sanitizeBaseName(item.name || `image-${index + 1}`);
      folder.file(`${baseName}-poster.png`, item.blob);
    });

    const content = await zip.generateAsync({ type: "blob", streamFiles: true });
    clearZipLink();
    const url = URL.createObjectURL(content);
    currentZipUrl = url;
    if (zipLink) {
      zipLink.href = url;
      zipLink.download = "xiaohongshu-posters.zip";
    }
    if (zipLinkWrap) {
      zipLinkWrap.hidden = false;
    }
    if (zipLink) {
      zipLink.click();
    }
  } catch (error) {
    console.error(error);
    const message = error && error.message ? error.message : "未知错误";
    alert(`打包失败：${message}`);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "打包 ZIP";
  }
}

bgInput.addEventListener("change", () => {
  refreshStatus();
  if (!getSources().length) {
    clearPreview();
  }
  clearZipLink();
});

textInput.addEventListener("input", () => {
  refreshStatus();
  clearZipLink();
});

generateBtn.addEventListener("click", async () => {
  await buildEntries();
});

shuffleBtn.addEventListener("click", async () => {
  await rerollFonts();
});

downloadBtn.addEventListener("click", async () => {
  await downloadZip();
});

if (selectAllTemplatesBtn) {
  selectAllTemplatesBtn.addEventListener("click", () => {
    templateLibrary.forEach((template) => selectedTemplates.add(template.name));
    templateLibrary.forEach((template) => setTemplateSelected(template.name, true));
    refreshStatus();
  });
}

if (clearTemplatesBtn) {
  clearTemplatesBtn.addEventListener("click", () => {
    selectedTemplates.clear();
    templateLibrary.forEach((template) => setTemplateSelected(template.name, false));
    refreshStatus();
  });
}

renderTemplateGrid();
refreshStatus();
