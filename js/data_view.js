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

const totalCount = document.getElementById("totalCount");
const parentCount = document.getElementById("parentCount");
const childCount = document.getElementById("childCount");
const fileCount = document.getElementById("fileCount");
const totalSize = document.getElementById("totalSize");
const dataSourceName = document.getElementById("dataSourceName");
const batchDisplay = document.getElementById("batchDisplay");

const parentTableBody = document.getElementById("parentTableBody");
const childTableBody = document.getElementById("childTableBody");
const detailTitle = document.getElementById("detailTitle");
const detailPre = document.getElementById("detailPre");

let firebaseUser = null;
let sourceMap = {};
let currentDataSource = null;
let items = [];
let itemMap = new Map();
let childMap = new Map();
let selectedParentId = "";
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


function getDisplayName(item) {
  return (
    normalizeText(item?.display_name) ||
    normalizeText(item?.file_name) ||
    normalizeText(item?.title) ||
    normalizeText(item?.description) ||
    `${normalizeText(item?.item_type) || "データ"} ${
      Number(item?.source_index ?? 0) + 1
    }`
  );
}


function getTypeLabel(item) {
  const labels = {
    raw_response: "ルート",
    list_item: "一覧",
    parent: "親",
    child: "子",
    grandchild: "孫",
    file: "ファイル"
  };

  const itemType = normalizeText(item?.item_type);
  return labels[itemType] || itemType || "データ";
}


function showEmpty(message = "データソースを選択してください。") {
  emptyPanel.textContent = message;
  emptyPanel.classList.remove("hidden");
  dataPanel.classList.add("hidden");
  btnReload.disabled = !currentDataSource;

  totalCount.textContent = "0 件";
  parentCount.textContent = "0 件";
  childCount.textContent = "0 件";
  fileCount.textContent = "0 件";
  totalSize.textContent = "0 B";

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
  detailTitle.textContent = "データを選択してください。";
  detailPre.textContent = "データを選択してください。";
  btnDownload.disabled = true;
}


function buildRelations() {
  itemMap = new Map();
  childMap = new Map();

  items.forEach(item => {
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


function getTopLevelItems() {
  const relatedIds = new Set();

  childMap.forEach((children, parentId) => {
    relatedIds.add(parentId);
    children.forEach(child => relatedIds.add(normalizeText(child.item_id)));
  });

  const explicitParents = items.filter(item =>
    normalizeText(item.item_type) === "parent"
  );

  if (explicitParents.length > 0) {
    return explicitParents;
  }

  const withoutParent = items.filter(item =>
    !normalizeText(item.parent_id) &&
    normalizeText(item.item_type) !== "raw_response"
  );

  if (withoutParent.length > 0) {
    return withoutParent;
  }

  return items.filter(item =>
    normalizeText(item.item_type) !== "raw_response"
  );
}


function renderSummary(result) {
  const summary = result?.summary || {};

  totalCount.textContent = `${Number(summary.total_count || 0)} 件`;
  parentCount.textContent = `${Number(summary.parent_count || 0)} 件`;
  childCount.textContent = `${Number(summary.child_count || 0)} 件`;
  fileCount.textContent = `${Number(summary.file_count || 0)} 件`;
  totalSize.textContent = formatBytes(summary.total_size_bytes);

  dataSourceName.textContent =
    normalizeText(result?.data_source_name) ||
    normalizeText(currentDataSource?.data_source_name) ||
    "-";

  const batchId = normalizeText(result?.latest_batch_id);
  batchDisplay.textContent = batchId
    ? `${batchId.slice(0, 12)}…`
    : "-";
  batchDisplay.title = batchId;
}


function renderParents() {
  const parents = getTopLevelItems();
  parentTableBody.innerHTML = "";

  if (parents.length === 0) {
    renderPlaceholder(
      parentTableBody,
      "取得済みデータはありません。",
      5
    );
    renderPlaceholder(
      childTableBody,
      "親データを選択してください。",
      5
    );
    return;
  }

  parents.forEach((item, index) => {
    const itemId = normalizeText(item.item_id);
    const row = document.createElement("tr");
    row.dataset.itemId = itemId;

    const directChildren = childMap.get(itemId) || [];
    const description = normalizeText(item.description);

    row.innerHTML = `
      <td class="col-index">${index + 1}</td>
      <td title="${escapeHtml(getDisplayName(item))}">
        ${escapeHtml(getDisplayName(item))}
        ${description ? `<span class="cell-secondary">${escapeHtml(description)}</span>` : ""}
      </td>
      <td class="col-type">${escapeHtml(getTypeLabel(item))}</td>
      <td class="col-count">${directChildren.length}</td>
      <td class="col-date">${escapeHtml(formatDate(item.created_at))}</td>
    `;

    row.addEventListener("click", () => {
      selectParent(itemId);
    });

    parentTableBody.appendChild(row);
  });

  selectParent(normalizeText(parents[0].item_id));
}


function selectParent(itemId) {
  selectedParentId = itemId;

  parentTableBody.querySelectorAll("tr[data-item-id]").forEach(row => {
    row.classList.toggle(
      "selected-row",
      row.dataset.itemId === itemId
    );
  });

  const parent = itemMap.get(itemId);
  const children = childMap.get(itemId) || [];

  if (children.length > 0) {
    renderChildren(children);
  } else if (parent) {
    renderChildren([parent]);
  } else {
    renderPlaceholder(
      childTableBody,
      "子データはありません。",
      5
    );
  }

  if (parent) {
    loadDetail(parent.item_id).catch(handleError);
  }
}


function renderChildren(children) {
  childTableBody.innerHTML = "";

  children.forEach((item, index) => {
    const itemId = normalizeText(item.item_id);
    const row = document.createElement("tr");
    row.dataset.itemId = itemId;

    const isDownloadable = Boolean(normalizeText(item.gcs_path));

    row.innerHTML = `
      <td class="col-index">${index + 1}</td>
      <td title="${escapeHtml(getDisplayName(item))}">
        ${escapeHtml(getDisplayName(item))}
        <span class="cell-secondary">${escapeHtml(getTypeLabel(item))}</span>
      </td>
      <td class="col-extension">${escapeHtml(normalizeText(item.extension) || "-")}</td>
      <td class="col-size">${escapeHtml(formatBytes(item.size_bytes))}</td>
      <td class="col-action">
        <button class="btn row-download" type="button" ${isDownloadable ? "" : "disabled"}>
          DL
        </button>
      </td>
    `;

    row.addEventListener("click", () => {
      selectChild(itemId);
    });

    const downloadButton = row.querySelector(".row-download");
    downloadButton?.addEventListener("click", event => {
      event.stopPropagation();
      downloadItem(itemId).catch(handleError);
    });

    childTableBody.appendChild(row);
  });

  if (children.length > 0) {
    selectChild(normalizeText(children[0].item_id));
  }
}


function selectChild(itemId) {
  childTableBody.querySelectorAll("tr[data-item-id]").forEach(row => {
    row.classList.toggle(
      "selected-row",
      row.dataset.itemId === itemId
    );
  });

  loadDetail(itemId).catch(handleError);
}


async function loadDetail(itemId) {
  if (!itemId) {
    clearDetail();
    return;
  }

  detailTitle.textContent = "読み込み中...";
  detailPre.textContent = "読み込み中...";
  btnDownload.disabled = true;

  const result = await authenticatedJsonOrThrow(
    `${API_BASE}/data-view/items/${encodeURIComponent(itemId)}`,
    {
      method: "GET"
    }
  );

  const item = result?.item || {};
  selectedItemId = normalizeText(item.item_id);
  detailTitle.textContent = getDisplayName(item);
  detailPre.textContent = JSON.stringify(item, null, 2);
  btnDownload.disabled = !normalizeText(item.gcs_path);
}


async function loadItems() {
  const dataSourceId = normalizeText(
    currentDataSource?.data_source_id
  );

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

    items = Array.isArray(result?.items)
      ? result.items
      : [];

    buildRelations();
    renderSummary(result);
    showDataPanel();
    renderParents();

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
      // JSONでないエラーは既定メッセージを使用する。
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const fileName = match
    ? decodeURIComponent(match[1])
    : getDisplayName(itemMap.get(normalizedItemId) || {}) || "download.bin";

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}


async function loadDataSourceDetail(source) {
  const dataSourceId = normalizeText(
    source?.data_source_id ||
    source?.id
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
      detail.dataSourceId ||
      detail.sourceId ||
      detail.sourceKey
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
            detail.dataSourceName ||
            detail.sourceLabel ||
            ""
        };

      currentDataSource = await loadDataSourceDetail(source);
      await loadItems();

    } catch (error) {
      currentDataSource = null;
      showEmpty(
        error.message ||
        "取得データを読み込めませんでした。"
      );
      handleError(error);
    }
  });
}


function handleError(error) {
  console.error("データ照会エラー:", error);
  alert(
    error?.message ||
    "データ照会処理でエラーが発生しました。"
  );
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
      {
        id: "btnMenu",
        label: "メニュー"
      },
      {
        id: "btnLogout",
        label: "ログアウト"
      }
    ]
  });
}


document.addEventListener("DOMContentLoaded", () => {
  initialize().catch(handleError);
});
