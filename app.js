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

const fontPool = [
  "ZCOOL KuaiLe",
  "ZCOOL XiaoWei",
  "Noto Sans HK",
  "Noto Sans TC",
  "Noto Serif HK",
  "Noto Sans SC",
];

const MAX_CANVAS_EDGE = 1600;

let entries = [];
const selectedTemplates = new Set();
const templateItemMap = new Map();

const templateLibrary = [
  { name: "IMG_5315.JPG", src: "templates/IMG_5315.JPG" },
  { name: "IMG_5316.JPG", src: "templates/IMG_5316.JPG" },
  { name: "IMG_5317.JPG", src: "templates/IMG_5317.JPG" },
  { name: "IMG_5319.JPG", src: "templates/IMG_5319.JPG" },
  { name: "IMG_5320.JPG", src: "templates/IMG_5320.JPG" },
  { name: "IMG_5321.JPG", src: "templates/IMG_5321.JPG" },
  { name: "IMG_5322.JPG", src: "templates/IMG_5322.JPG" },
  { name: "IMG_5323.JPG", src: "templates/IMG_5323.JPG" },
  { name: "IMG_5324.JPG", src: "templates/IMG_5324.JPG" },
  { name: "IMG_5325.JPG", src: "templates/IMG_5325.JPG" },
  { name: "IMG_5326.JPG", src: "templates/IMG_5326.JPG" },
  { name: "IMG_5327.JPG", src: "templates/IMG_5327.JPG" },
  { name: "IMG_5328.JPG", src: "templates/IMG_5328.JPG" },
  { name: "IMG_5329.JPG", src: "templates/IMG_5329.JPG" },
  { name: "IMG_5330.JPG", src: "templates/IMG_5330.JPG" },
  { name: "IMG_5331.JPG", src: "templates/IMG_5331.JPG" },
  { name: "IMG_5332.JPG", src: "templates/IMG_5332.JPG" },
  { name: "IMG_5333.JPG", src: "templates/IMG_5333.JPG" },
  { name: "IMG_5334.JPG", src: "templates/IMG_5334.JPG" },
  { name: "IMG_5335.JPG", src: "templates/IMG_5335.JPG" },
  { name: "IMG_5336.JPG", src: "templates/IMG_5336.JPG" },
  { name: "IMG_5337.JPG", src: "templates/IMG_5337.JPG" },
  { name: "IMG_5338.JPG", src: "templates/IMG_5338.JPG" },
  { name: "IMG_5339.JPG", src: "templates/IMG_5339.JPG" },
  { name: "IMG_5340.JPG", src: "templates/IMG_5340.JPG" },
  { name: "IMG_5342.JPG", src: "templates/IMG_5342.JPG" },
  { name: "IMG_5343.JPG", src: "templates/IMG_5343.JPG" },
  { name: "IMG_5344.JPG", src: "templates/IMG_5344.JPG" },
  { name: "IMG_5345.JPG", src: "templates/IMG_5345.JPG" },
  { name: "IMG_5348.JPG", src: "templates/IMG_5348.JPG" },
  { name: "IMG_5349.JPG", src: "templates/IMG_5349.JPG" },
  { name: "IMG_5350.JPG", src: "templates/IMG_5350.JPG" },
  { name: "IMG_5351.JPG", src: "templates/IMG_5351.JPG" },
  { name: "IMG_5352.JPG", src: "templates/IMG_5352.JPG" },
];

function pickRandomFont() {
  return fontPool[Math.floor(Math.random() * fontPool.length)];
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

function tokenizeText(text) {
  const tokens = [];
  const wordRegex = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    wordRegex.lastIndex = i;
    const match = wordRegex.exec(text);
    if (match && match.index === i) {
      tokens.push(match[0]);
      i += match[0].length;
      continue;
    }
    tokens.push(ch);
    i += 1;
  }
  return tokens;
}

function chunkText(text) {
  const tokens = tokenizeText(text);
  const lines = [];
  let current = "";
  let count = 0;

  for (const token of tokens) {
    const tokenLen = token.length;
    if (count > 0 && count + tokenLen > 5) {
      lines.push(current);
      current = "";
      count = 0;
    }
    if (tokenLen > 5 && count === 0) {
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
  let size = Math.floor(maxLineWidth / 5);
  size = Math.max(24, size);

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
    await document.fonts.load(`700 36px "${font}"`);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);

  const { size, lineHeight } = estimateFontSize(lines, canvas);
  const centerX = canvas.width / 2;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

  ctx.save();
  ctx.font = `700 ${size}px "${font}", "Noto Sans SC", sans-serif`;
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

  try {
    const images = await Promise.all(sources.map((source) => loadImageFromSource(source)));

    entries = sources.map((source, index) => {
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

  const zip = new JSZip();
  const folder = zip.folder("posters");

  const blobs = await Promise.all(
    entries.map(
      (entry) =>
        new Promise((resolve) => {
          entry.canvas.toBlob((blob) => resolve(blob), "image/png");
        })
    )
  );

  blobs.forEach((blob, index) => {
    if (!blob) return;
    const baseName = sanitizeBaseName(entries[index].name || `image-${index + 1}`);
    folder.file(`${baseName}-poster.png`, blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = "xiaohongshu-posters.zip";
  link.click();
  URL.revokeObjectURL(url);
}

bgInput.addEventListener("change", () => {
  refreshStatus();
  if (!getSources().length) {
    clearPreview();
  }
});

textInput.addEventListener("input", () => {
  refreshStatus();
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
