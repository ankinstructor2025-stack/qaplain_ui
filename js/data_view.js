import {
  API_BASE_URL
} from "./config.js";

import {
  waitForLogin,
  authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";


const API_BASE = API_BASE_URL;

const emptyPanel = document.getElementById("emptyPanel");
const dataPanel = document.getElementById("dataPanel");
const btnReload = document.getElementById("btnReload");
const btnDownload = document.getElementById("btnDownload");
const sourceUrlLink = document.getElementById("sourceUrlLink");

const totalCount = document.getElementById("totalCount");
const parentCount = document.getElementById("parentCount");
const childCount = document.getElementById("childCount");
const totalSize = document.getElementById("totalSize");
const dataSourceName = document.getElementById("dataSourceName");
const processingPatternDisplay = document.getElementById("processingPatternDisplay");
const batchDisplay = document.getElementById("batchDisplay");

const flatListSection = document.getElementById("flatListSection");
const flatListTitle = document.getElementById("flatListTitle");
const flatTableBody = document.getElementById("flatTableBody");
const relationListSection = document.getElementById("relationListSection");
const parentTableBody = document.getElementById("parentTableBody");
const childTableBody = document.getElementById("childTableBody");
const detailTitle = document.getElementById("detailTitle");
const detailPre = document.getElementById("detailPre");

let firebaseUser = null;
let sourceMap = {};
let currentDataSource = null;
let currentPattern = "";
let items = [];
let itemMap = new Map();
let childMap = new Map();
let selectedItemId = "";


function normalizeText(value) {
  return String(value ?? "").trim();
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const number = bytes / (1024 ** index);

  return `${number.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}


function formatDate(value) {
  const text = normalizeText(value);

  if (!text) {
    return "-";
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


function getPatternLabel(pattern) {
  const labels = {
    raw: "そのまま保存",
    json_list: "一覧展開",
    parent_child: "親子展開",
    parent_child_grandchild: "親子孫展開",
    file_links: "リンク先ファイル取得"
  };

  return labels[pattern] || pattern || "-";
}


function getTypeLabel(item) {
  const labels = {
    list_item: "一覧",
    parent: "親",
    child: "子",
    grandchild: "孫",
    file: "ファイル"
  };

  const itemType = normalizeText(item?.item_type);
  return labels[itemType] || itemType || "データ";
}


function getFileName(item) {
  return (
    normalizeText(item?.file_name) ||
    normalizeText(item?.display_name) ||
    normalizeText(item?.title) ||
    `${normalizeText(item?.item_type) || "data"}.${normalizeText(item?.extension) || "bin"}`
  );
}


function isRelationPattern(pattern) {
  return (
    pattern === "parent_child" ||
    pattern === "parent_child_grandchild"
  );
}


function getVisibleItems() {
  return items.filter(
    item => normalizeText(item.item_type) !== "raw_response"
  );
}


function showEmpty(message = "データソースを選択してください。") {
  emptyPanel.textContent = message;
  emptyPanel.classList.remove("hidden");
  dataPanel.classList.add("hidden");
  btnReload.disabled = !currentDataSource;

  totalCount.textContent = "0 件";
  parentCount.textContent = "0 件";
  childCount.textContent = "0 件";
  totalSize.textContent = "0 B";

  flatTableBody.innerHTML = "";
  parentTableBody.innerHTML = "";
  childTableBody.innerHTML = "";
  clearDetail();
}


function showDataPanel() {
  emptyPanel.classList.add("hidden");
  dataPanel.classList.remove("hidden");
  btnReload.disabled = false;
}


function renderPlaceholder(tbody, message, columnCount) {
  tbody.innerHTML = `
    <tr class="placeholder-row">
      <td colspan="${columnCount}">${escapeHtml(message)}</td>
    </tr>
  `;
}


function clearDetail() {
  selectedItemId = "";
  detailTitle.textContent = "ファイルを選択してください。";
  detailPre.textContent = "ファイルを選択してください。";
  btnDownload.disabled = true;
  sourceUrlLink.classList.add("hidden");
  sourceUrlLink.removeAttribute("href");
}


function buildRelations() {
  itemMap = new Map();
  childMap = new Map();

  getVisibleItems().forEach(item => {
    const itemId = normalizeText(item.item_id);

    if (itemId) {
      itemMap.set(itemId, item);
    }

    const parentId = normalizeText(item.parent_id);

    if (parentId) {
      const children = childMap.get(parentId) || [];
      children.push(item);
      childMap.set(parentId, children);
    }
  });
}


function getAllDescendants(parentId) {
  const result = [];
  const queue = [...(childMap.get(parentId) || [])];

  while (queue.length > 0) {
    const item = queue.shift();
    result.push(item);

    const itemId = normalizeText(item.item_id);
    if (itemId) {
      queue.push(...(childMap.get(itemId) || []));
    }
  }

  return result;
}


function renderSummary(result) {
  const summary = result?.summary || {};

  totalCount.textContent = `${Number(summary.total_count || 0)} 件`;
  parentCount.textContent = `${Number(summary.parent_count || 0)} 件`;
  childCount.textContent = `${Number(summary.child_count || 0)} 件`;
  totalSize.textContent = formatBytes(summary.total_size_bytes);

  dataSourceName.textContent =
    normalizeText(result?.data_source_name) ||
    normalizeText(currentDataSource?.data_source_name) ||
    "-";

  currentPattern =
    normalizeText(result?.processing_pattern) ||
    normalizeText(currentDataSource?.processing_pattern);

  processingPatternDisplay.textContent = getPatternLabel(currentPattern);

  const batchId = normalizeText(result?.latest_batch_id);
  batchDisplay.textContent = batchId
    ? `${batchId.slice(0, 12)}…`
    : "-";
  batchDisplay.title = batchId;
}


function createDownloadButton(itemId) {
  return `
    <button class="btn row-download" type="button" data-item-id="${escapeHtml(itemId)}">
      DL
    </button>
  `;
}


function bindRowActions(tbody) {
  tbody.querySelectorAll("tr[data-item-id]").forEach(row => {
    const itemId = normalizeText(row.dataset.itemId);

    row.addEventListener("click", () => {
      selectItem(itemId, tbody);
    });
  });

  tbody.querySelectorAll(".row-download").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      downloadItem(button.dataset.itemId).catch(handleError);
    });
  });
}


function renderFlatList() {
  flatListSection.classList.remove("hidden");
  relationListSection.classList.add("hidden");

  flatListTitle.textContent = currentPattern === "file_links"
    ? "取得ファイル一覧"
    : "取得データファイル一覧";

  const visibleItems = getVisibleItems();
  flatTableBody.innerHTML = "";

  if (visibleItems.length === 0) {
    renderPlaceholder(flatTableBody, "取得済みファイルはありません。", 7);
    clearDetail();
    return;
  }

  visibleItems.forEach((item, index) => {
    const itemId = normalizeText(item.item_id);
    const sourceUrl = normalizeText(item.source_url);
    const row = document.createElement("tr");
    row.dataset.itemId = itemId;

    row.innerHTML = `
      <td class="col-index">${index + 1}</td>
      <td title="${escapeHtml(getFileName(item))}">${escapeHtml(getFileName(item))}</td>
      <td class="col-url" title="${escapeHtml(sourceUrl)}">
        ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceUrl)}</a>` : "-"}
      </td>
      <td class="col-extension">${escapeHtml(normalizeText(item.extension) || "-")}</td>
      <td class="col-size">${escapeHtml(formatBytes(item.size_bytes))}</td>
      <td class="col-date">${escapeHtml(formatDate(item.created_at))}</td>
      <td class="col-action">${createDownloadButton(itemId)}</td>
    `;

    flatTableBody.appendChild(row);
  });

  bindRowActions(flatTableBody);
  selectItem(normalizeText(visibleItems[0].item_id), flatTableBody);
}


function renderRelationList() {
  flatListSection.classList.add("hidden");
  relationListSection.classList.remove("hidden");

  const parents = getVisibleItems().filter(
    item => normalizeText(item.item_type) === "parent"
  );

  parentTableBody.innerHTML = "";

  if (parents.length === 0) {
    renderPlaceholder(parentTableBody, "親ファイルはありません。", 5);
    renderPlaceholder(childTableBody, "親ファイルを選択してください。", 5);
    clearDetail();
    return;
  }

  parents.forEach((item, index) => {
    const itemId = normalizeText(item.item_id);
    const descendants = getAllDescendants(itemId);
    const row = document.createElement("tr");
    row.dataset.itemId = itemId;

    row.innerHTML = `
      <td class="col-index">${index + 1}</td>
      <td title="${escapeHtml(getFileName(item))}">${escapeHtml(getFileName(item))}</td>
      <td class="col-count">${descendants.length}</td>
      <td class="col-size">${escapeHtml(formatBytes(item.size_bytes))}</td>
      <td class="col-action">${createDownloadButton(itemId)}</td>
    `;

    row.addEventListener("click", () => {
      selectParent(itemId);
    });

    parentTableBody.appendChild(row);
  });

  parentTableBody.querySelectorAll(".row-download").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      downloadItem(button.dataset.itemId).catch(handleError);
    });
  });

  selectParent(normalizeText(parents[0].item_id));
}


function selectParent(itemId) {
  parentTableBody.querySelectorAll("tr[data-item-id]").forEach(row => {
    row.classList.toggle("selected-row", row.dataset.itemId === itemId);
  });

  const descendants = getAllDescendants(itemId);
  childTableBody.innerHTML = "";

  if (descendants.length === 0) {
    renderPlaceholder(childTableBody, "子・孫ファイルはありません。", 5);
  } else {
    descendants.forEach((item, index) => {
      const childId = normalizeText(item.item_id);
      const row = document.createElement("tr");
      row.dataset.itemId = childId;

      row.innerHTML = `
        <td class="col-index">${index + 1}</td>
        <td title="${escapeHtml(getFileName(item))}">${escapeHtml(getFileName(item))}</td>
        <td class="col-type">${escapeHtml(getTypeLabel(item))}</td>
        <td class="col-size">${escapeHtml(formatBytes(item.size_bytes))}</td>
        <td class="col-action">${createDownloadButton(childId)}</td>
      `;

      childTableBody.appendChild(row);
    });

    bindRowActions(childTableBody);
  }

  selectItem(itemId, parentTableBody);
}


function selectItem(itemId, tbody) {
  tbody.querySelectorAll("tr[data-item-id]").forEach(row => {
    row.classList.toggle("selected-row", row.dataset.itemId === itemId);
  });

  loadDetail(itemId).catch(handleError);
}


async function loadDetail(itemId) {
  if (!itemId) {
    clearDetail();
    return;
  }

  detailTitle.textContent = "読み込み中...";
  detailPre.textContent = "Cloud Storageから読み込んでいます...";
  btnDownload.disabled = true;
  sourceUrlLink.classList.add("hidden");

  const result = await authenticatedJsonOrThrow(
    `${API_BASE}/data-view/items/${encodeURIComponent(itemId)}`,
    {
      method: "GET"
    }
  );

  const item = result?.item || {};
  selectedItemId = normalizeText(item.item_id);
  detailTitle.textContent = getFileName(item);

  if (result?.content_json !== null && result?.content_json !== undefined) {
    detailPre.textContent = JSON.stringify(result.content_json, null, 2);
  } else if (result?.content_available) {
    detailPre.textContent = normalizeText(result.content_text);
  } else {
    detailPre.textContent = "この形式は画面表示できません。ダウンロードして確認してください。";
  }

  const sourceUrl = normalizeText(item.source_url);
  if (sourceUrl) {
    sourceUrlLink.href = sourceUrl;
    sourceUrlLink.classList.remove("hidden");
  } else {
    sourceUrlLink.classList.add("hidden");
    sourceUrlLink.removeAttribute("href");
  }

  btnDownload.disabled = !normalizeText(item.gcs_path);
}


async function loadItems() {
  const dataSourceId = normalizeText(currentDataSource?.data_source_id);

  if (!dataSourceId) {
    showEmpty();
    return;
  }

  btnReload.disabled = true;
  showEmpty("取得データを読み込んでいます...");

  try {
    const result = await authenticatedJsonOrThrow(
      `${API_BASE}/data-view/items?data_source_id=${encodeURIComponent(dataSourceId)}`,
      {
        method: "GET"
      }
    );

    items = Array.isArray(result?.items) ? result.items : [];
    buildRelations();
    renderSummary(result);
    showDataPanel();

    if (isRelationPattern(currentPattern)) {
      renderRelationList();
    } else {
      renderFlatList();
    }
  } finally {
    btnReload.disabled = false;
  }
}


async function downloadItem(itemId) {
  const normalizedItemId = normalizeText(itemId);

  if (!normalizedItemId) {
    return;
  }

  if (!firebaseUser) {
    firebaseUser = await waitForLogin();
  }

  const token = await firebaseUser.getIdToken();
  const response = await fetch(
    `${API_BASE}/data-view/items/${encodeURIComponent(normalizedItemId)}/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    let message = "ファイルをダウンロードできませんでした。";

    try {
      const errorBody = await response.json();
      message = typeof errorBody?.detail === "string"
        ? errorBody.detail
        : errorBody?.detail?.message || message;
    } catch (_) {
      // JSONでないエラーは既定メッセージを使う。
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const fileName = match
    ? decodeURIComponent(match[1])
    : getFileName(itemMap.get(normalizedItemId) || {});

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "download.bin";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}


async function loadDataSourceDetail(source) {
  const dataSourceId = normalizeText(
    source?.data_source_id || source?.id
  );

  if (!dataSourceId) {
    return null;
  }

  const result = await authenticatedJsonOrThrow(
    `${API_BASE}/data-sources/${encodeURIComponent(dataSourceId)}`,
    {
      method: "GET"
    }
  );

  return result?.data_source || result;
}


function bindToolbarEvents() {
  document.addEventListener("toolbar:ready", event => {
    sourceMap = event.detail?.sourceMap || {};
    currentDataSource = null;
    items = [];
    showEmpty();
  });

  document.addEventListener("toolbar:source-change", async event => {
    const detail = event.detail || {};
    const sourceId = normalizeText(
      detail.dataSourceId || detail.sourceId || detail.sourceKey
    );

    if (!sourceId) {
      currentDataSource = null;
      items = [];
      showEmpty();
      return;
    }

    try {
      const source =
        detail.dataSource ||
        sourceMap[sourceId] ||
        {
          data_source_id: sourceId,
          data_source_name:
            detail.dataSourceName || detail.sourceLabel || ""
        };

      currentDataSource = await loadDataSourceDetail(source);
      await loadItems();
    } catch (error) {
      currentDataSource = null;
      showEmpty(error.message || "取得データを読み込めませんでした。");
      handleError(error);
    }
  });
}


function handleError(error) {
  console.error("データ照会エラー:", error);
  alert(error?.message || "データ照会処理でエラーが発生しました。");
}


async function initialize() {
  firebaseUser = await waitForLogin();
  bindToolbarEvents();

  btnReload.addEventListener("click", () => {
    loadItems().catch(handleError);
  });

  btnDownload.addEventListener("click", () => {
    downloadItem(selectedItemId).catch(handleError);
  });

  if (typeof window.renderPageToolbar !== "function") {
    throw new Error("common_toolbar.jsを読み込めませんでした。");
  }

  await window.renderPageToolbar({
    mountId: "pageToolbar",
    title: "データ照会",
    showSourceSelect: true,
    showDbSelect: false,
    enableDbAutoLoad: false,
    actions: [
      { id: "btnMenu", label: "メニュー" },
      { id: "btnLogout", label: "ログアウト" }
    ]
  });
}


document.addEventListener("DOMContentLoaded", () => {
  initialize().catch(handleError);
});
