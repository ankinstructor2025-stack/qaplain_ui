/**
 * data_import.js
 *
 * 役割
 * - 共通ツールバーで選択されたデータソースを保持
 * - authentication_method_keyに応じて入力パネルを切り替え
 * - ファイル型データソースの対象拡張子を設定
 * - アップロード済みファイル一覧を表示
 * - authentication_method_keyに応じて取込処理を振り分け
 */

import {
  API_BASE_URL
} from "./config.js";

import {
  waitForLogin,
  authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";


console.log(
  "data_import.js loaded"
);


const API_BASE =
  API_BASE_URL;


const panelEmpty =
  document.getElementById(
    "panelEmpty"
  );

const panelUpload =
  document.getElementById(
    "panelUpload"
  );

const panelUrl =
  document.getElementById(
    "panelUrl"
  );

const panelApi =
  document.getElementById(
    "panelApi"
  );

const panelKokkai =
  document.getElementById(
    "panelKokkai"
  );

const panelOpenData =
  document.getElementById(
    "panelOpenData"
  );


const uploadFileInput =
  document.getElementById(
    "uploadFileInput"
  );

const uploadFileName =
  document.getElementById(
    "uploadFileName"
  );

const uploadedFileList =
  document.getElementById(
    "uploadedFileList"
  );


const apiImportResult =
  document.getElementById(
    "apiImportResult"
  );

const apiResultUrl =
  document.getElementById(
    "apiResultUrl"
  );

const apiResultContentType =
  document.getElementById(
    "apiResultContentType"
  );

const apiResultSize =
  document.getElementById(
    "apiResultSize"
  );

const apiResultStoragePath =
  document.getElementById(
    "apiResultStoragePath"
  );

const apiResultPreview =
  document.getElementById(
    "apiResultPreview"
  );


const importProgress =
  document.getElementById(
    "importProgress"
  );

const importProgressStatus =
  document.getElementById(
    "importProgressStatus"
  );

const importProgressCount =
  document.getElementById(
    "importProgressCount"
  );

const importProgressRunning =
  document.getElementById(
    "importProgressRunning"
  );

const importProgressQueued =
  document.getElementById(
    "importProgressQueued"
  );

const importProgressFailed =
  document.getElementById(
    "importProgressFailed"
  );

const importProgressBar =
  document.getElementById(
    "importProgressBar"
  );

const importProgressPercent =
  document.getElementById(
    "importProgressPercent"
  );

const importProgressParent =
  document.getElementById(
    "importProgressParent"
  );

const importProgressChild =
  document.getElementById(
    "importProgressChild"
  );

const importProgressUpdatedAt =
  document.getElementById(
    "importProgressUpdatedAt"
  );

const importProgressNextRefresh =
  document.getElementById(
    "importProgressNextRefresh"
  );

const btnRefreshProgress =
  document.getElementById(
    "btnRefreshProgress"
  );


const logText =
  document.getElementById(
    "logText"
  );

const btnClearLog =
  document.getElementById(
    "btnClearLog"
  );

const btnUploadRegister =
  document.getElementById(
    "btnUploadRegister"
  );

const btnUrlRegister =
  document.getElementById(
    "btnUrlRegister"
  );

const btnApiRegister =
  document.getElementById(
    "btnApiRegister"
  );

const btnKokkaiRegister =
  document.getElementById(
    "btnKokkaiRegister"
  );

const btnFetchDatasets =
  document.getElementById(
    "btnFetchDatasets"
  );


const deleteDataSourceButtons =
  Array.from(
    document.querySelectorAll(
      '[data-action="delete-data-source-data"]'
    )
  );


let sourceMap = {};

let currentDataSource =
  null;

let currentImportMethod =
  "";

let activeBatchId =
  "";

let activeTaskDataSource =
  null;

let progressRefreshTimer =
  null;

let progressCountdownTimer =
  null;

let nextProgressRefreshAt =
  null;

let progressRefreshInFlight =
  false;

let lastBatchStatus =
  "";


const TASK_POLL_INTERVAL_MS =
  30 * 1000;

const TASK_POLL_TIMEOUT_MS =
  60 * 60 * 1000;


function writeLog(
  message
) {
  if (!logText) {
    return;
  }

  const now =
    new Date();

  const hh =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );

  const mm =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );

  const ss =
    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    );

  logText.textContent +=
    `[${hh}:${mm}:${ss}] ${String(message ?? "")}\n`;

  logText.scrollTop =
    logText.scrollHeight;
}


function clearLog() {
  if (logText) {
    logText.textContent =
      "";
  }
}


async function getCurrentIdToken() {
  const user =
    await waitForLogin();

  return await user.getIdToken();
}


function normalizeSourceType(
  value
) {
  const sourceType =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /-/g,
        "_"
      );

  switch (sourceType) {
    case "upload":
      return "file";

    case "public_url":
      return "url";

    case "public_api":
      return "api";

    case "email":
      return "mail";

    default:
      return sourceType;
  }
}


function normalizeAuthenticationMethodKey(
  value
) {
  const methodKey =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /-/g,
        "_"
      );

  switch (methodKey) {
    case "":
    case "none":
    case "no_auth":
    case "no_authentication":
      return "none";

    case "credential":
    case "credentials":
      return "client_credentials";

    default:
      return methodKey;
  }
}


function normalizeExtension(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /^\.+/,
      ""
    );
}


function getAllowedExtensions(
  dataSource
) {
  const sourceExtensions =
    dataSource?.extensions ||
    dataSource?.allowed_extensions ||
    dataSource?.file_extensions ||
    [];

  if (
    !Array.isArray(
      sourceExtensions
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      sourceExtensions
        .map(
          item => {
            if (
              typeof item ===
              "string"
            ) {
              return normalizeExtension(
                item
              );
            }

            return normalizeExtension(
              item?.extension ||
              item?.value ||
              ""
            );
          }
        )
        .filter(
          extension =>
            extension
        )
    )
  ];
}


function updateFileAccept(
  dataSource
) {
  if (!uploadFileInput) {
    return;
  }

  const extensions =
    getAllowedExtensions(
      dataSource
    );

  if (
    extensions.length === 0
  ) {
    uploadFileInput.removeAttribute(
      "accept"
    );

    return;
  }

  uploadFileInput.accept =
    extensions
      .map(
        extension =>
          `.${extension}`
      )
      .join(
        ","
      );
}


function syncSelectedFileName() {
  if (
    !uploadFileInput ||
    !uploadFileName
  ) {
    return;
  }

  const file =
    uploadFileInput.files?.[0];

  if (file) {
    uploadFileName.textContent =
      file.name;

    uploadFileName.classList.remove(
      "is-empty"
    );

    return;
  }

  uploadFileName.textContent =
    "ファイルが選択されていません";

  uploadFileName.classList.add(
    "is-empty"
  );
}


function clearSelectedFile() {
  if (uploadFileInput) {
    uploadFileInput.value =
      "";
  }

  syncSelectedFileName();
}


function hideAllPanels() {
  [
    panelEmpty,
    panelUpload,
    panelUrl,
    panelApi,
    panelKokkai,
    panelOpenData
  ].forEach(
    panel => {
      panel?.classList.add(
        "hidden"
      );
    }
  );
}


function showEmptyPanel() {
  hideAllPanels();

  panelEmpty?.classList.remove(
    "hidden"
  );
}


function showPanelForDataSource(
  dataSource
) {
  hideAllPanels();

  if (!dataSource) {
    panelEmpty?.classList.remove(
      "hidden"
    );

    return;
  }

  const methodKey =
    normalizeAuthenticationMethodKey(
      dataSource.authentication_method_key
    );

  const sourceType =
    normalizeSourceType(
      dataSource.source_type
    );

  if (
    methodKey === "file_upload"
  ) {
    updateFileAccept(
      dataSource
    );

    panelUpload?.classList.remove(
      "hidden"
    );

    return;
  }

  if (
    sourceType === "url"
  ) {
    panelUrl?.classList.remove(
      "hidden"
    );

    return;
  }

  if (
    sourceType === "api" ||
    sourceType === "mail"
  ) {
    const apiPanel =
      panelApi ||
      panelKokkai ||
      panelOpenData;

    apiPanel?.classList.remove(
      "hidden"
    );

    return;
  }

  panelEmpty?.classList.remove(
    "hidden"
  );
}


function normalizeDataSource(
  source
) {
  if (!source) {
    return null;
  }

  return {
    ...source,

    data_source_id:
      String(
        source.data_source_id ||
        source.sourceId ||
        source.sourceKey ||
        source.key ||
        ""
      ).trim(),

    data_source_name:
      String(
        source.data_source_name ||
        source.dataSourceName ||
        source.sourceLabel ||
        source.label ||
        ""
      ).trim(),

    source_type:
      normalizeSourceType(
        source.source_type ||
        source.sourceType ||
        source.type
      ),

    authentication_method_key:
      normalizeAuthenticationMethodKey(
        source.authentication_method_key ||
        source.authenticationMethodKey
      ),

    extensions:
      getAllowedExtensions(
        source
      )
  };
}


async function loadDataSourceDetail(
  dataSource
) {
  const normalized =
    normalizeDataSource(
      dataSource
    );

  if (
    !normalized ||
    !normalized.data_source_id
  ) {
    throw new Error(
      "データソースが選択されていません。"
    );
  }

  const response =
    await authenticatedJsonOrThrow(
      `${API_BASE}/data-sources/${
        encodeURIComponent(
          normalized.data_source_id
        )
      }`,
      {
        method:
          "GET"
      }
    );

  return normalizeDataSource(
    response?.data_source ||
    response
  );
}


function showUploadedFileMessage(
  message
) {
  if (!uploadedFileList) {
    return;
  }

  uploadedFileList.innerHTML = `
    <div class="uploaded-file-message">
      ${escapeHtml(message)}
    </div>
  `;
}


async function loadUploadedFiles() {
  if (!uploadedFileList) {
    return;
  }

  showUploadedFileMessage(
    "読み込み中..."
  );

  try {
    const result =
      await authenticatedJsonOrThrow(
        `${API_BASE}/data-import/uploaded-files`,
        {
          method:
            "GET"
        }
      );

    const files =
      Array.isArray(
        result?.uploaded_files
      )
        ? result.uploaded_files
        : [];

    renderUploadedFiles(
      files
    );

  } catch (error) {
    console.error(
      "アップロード済みファイル一覧取得エラー:",
      error
    );

    showUploadedFileMessage(
      error.message ||
      "アップロード済みファイルを取得できませんでした。"
    );
  }
}


function renderUploadedFiles(
  files
) {
  if (!uploadedFileList) {
    return;
  }

  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    showUploadedFileMessage(
      "アップロード済みファイルはありません。"
    );

    return;
  }

  uploadedFileList.innerHTML =
    files
      .map(
        file => `
          <div class="uploaded-file-row">
            <div class="uploaded-file-name">
              ${escapeHtml(file.file_name || "")}
            </div>

            <div class="uploaded-file-extension">
              ${escapeHtml(
                formatExtension(
                  file.extension
                )
              )}
            </div>

            <div class="uploaded-file-size">
              ${escapeHtml(
                formatFileSize(
                  file.size_bytes
                )
              )}
            </div>

            <div class="uploaded-file-date">
              ${escapeHtml(
                formatDateTime(
                  file.updated_at ||
                  file.created_at
                )
              )}
            </div>

            <div class="uploaded-file-status">
              ${escapeHtml(
                formatStatus(
                  file.status
                )
              )}
            </div>
          </div>
        `
      )
      .join(
        ""
      );
}


function formatExtension(
  value
) {
  const extension =
    normalizeExtension(
      value
    );

  return extension
    ? `.${extension}`
    : "";
}


function formatFileSize(
  value
) {
  const size =
    Number(
      value
    );

  if (
    !Number.isFinite(size) ||
    size < 0
  ) {
    return "";
  }

  if (
    size < 1024
  ) {
    return `${size} B`;
  }

  if (
    size < 1024 * 1024
  ) {
    return `${
      (size / 1024).toFixed(1)
    } KB`;
  }

  return `${
    (size / 1024 / 1024).toFixed(1)
  } MB`;
}


function formatDateTime(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false
    }
  ).format(
    date
  );
}


function formatStatus(
  value
) {
  switch (
    String(
      value || ""
    ).toLowerCase()
  ) {
    case "created":
    case "uploaded":
      return "登録済み";

    case "updated":
      return "更新済み";

    case "error":
      return "エラー";

    default:
      return String(
        value || ""
      );
  }
}


function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#39;"
    );
}



function showApiImportMessage(
  message
) {
  clearApiImportResult();

  if (!apiImportResult) {
    return;
  }

  if (apiResultPreview) {
    apiResultPreview.textContent =
      String(
        message || ""
      );

    apiResultPreview.classList.add(
      "is-empty"
    );
  }

  apiImportResult.classList.remove(
    "hidden"
  );
}


async function loadImportedItems(
  dataSourceId
) {
  if (!dataSourceId) {
    showApiImportMessage(
      "データソースを選択してください。"
    );

    return;
  }

  showApiImportMessage(
    "登録済みデータを読み込み中..."
  );

  try {
    const url =
      new URL(
        `${API_BASE}/data-import/items`
      );

    url.searchParams.set(
      "data_source_id",
      dataSourceId
    );

    const result =
      await authenticatedJsonOrThrow(
        url.toString(),
        {
          method:
            "GET"
        }
      );

    const item =
      result?.latest_item ||
      null;

    if (!item) {
      showApiImportMessage(
        "登録済みデータはありません。"
      );

      return;
    }

    renderApiImportResult(
      item
    );

  } catch (error) {
    console.error(
      "登録済みデータ取得エラー:",
      error
    );

    showApiImportMessage(
      error.message ||
      "登録済みデータを取得できませんでした。"
    );
  }
}


function clearApiImportResult() {
  apiImportResult?.classList.add(
    "hidden"
  );

  if (apiResultUrl) {
    apiResultUrl.textContent =
      "";
  }

  if (apiResultContentType) {
    apiResultContentType.textContent =
      "";
  }

  if (apiResultSize) {
    apiResultSize.textContent =
      "";
  }

  if (apiResultStoragePath) {
    apiResultStoragePath.textContent =
      "";
  }

  if (apiResultPreview) {
    apiResultPreview.textContent =
      "";
  }
}


function renderApiImportResult(
  result
) {
  if (
    !apiImportResult ||
    !result
  ) {
    return;
  }

  apiResultUrl.textContent =
    result.requested_url ||
    "";

  apiResultContentType.textContent =
    result.content_type ||
    "";

  apiResultSize.textContent =
    formatFileSize(
      result.size_bytes
    );

  apiResultStoragePath.textContent =
    result.gcs_path ||
    "";

  if (apiResultPreview) {
    if (
      result.preview_available &&
      result.preview_text
    ) {
      apiResultPreview.textContent =
        result.preview_text;

      apiResultPreview.classList.remove(
        "is-empty"
      );

    } else {
      apiResultPreview.textContent =
        "画面表示できない形式です。Cloud Storageに保存されたファイルを確認してください。";

      apiResultPreview.classList.add(
        "is-empty"
      );
    }
  }

  apiImportResult.classList.remove(
    "hidden"
  );
}


function bindDataImportResultEvent() {
  document.addEventListener(
    "data-import:result",
    event => {
      renderApiImportResult(
        event.detail?.result
      );
    }
  );
}


function sleep(
  milliseconds
) {
  return new Promise(
    resolve => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


function normalizeTaskStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function formatTaskStatus(
  value
) {
  switch (
    normalizeTaskStatus(value)
  ) {
    case "queued":
      return "待機中";

    case "running":
      return "取得中";

    case "completed":
      return "完了";

    case "not_started":
      return "未開始";

    case "failed":
    case "enqueue_failed":
      return "エラー";

    default:
      return String(value || "");
  }
}


function firstNumber(
  values,
  fallback = 0
) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number =
        Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return fallback;
}


function getTaskProgress(
  batch
) {
  const parentTotal =
    firstNumber([
      batch?.root_total,
      batch?.parent_total,
      batch?.parent_task_total,
      batch?.level1_total
    ]);

  const parentCompleted =
    firstNumber([
      batch?.root_completed,
      batch?.parent_completed,
      batch?.parent_processed,
      batch?.parent_task_completed,
      batch?.level1_completed
    ]);

  const childTotal =
    firstNumber([
      batch?.detail_total,
      batch?.child_total,
      batch?.child_task_total,
      batch?.level2_total
    ]);

  const childCompleted =
    firstNumber([
      batch?.detail_completed,
      batch?.child_completed,
      batch?.child_processed,
      batch?.child_task_completed,
      batch?.level2_completed
    ]);

  const total =
    firstNumber([
      batch?.total_count,
      batch?.total_tasks,
      batch?.task_total,
      parentTotal + childTotal
    ]);

  const completed =
    firstNumber([
      batch?.finished_count,
      batch?.completed_count,
      batch?.processed_count,
      batch?.completed_tasks,
      parentCompleted + childCompleted
    ]);

  const percent =
    Number.isFinite(
      Number(
        batch?.progress_percent
      )
    )
      ? Math.min(
          100,
          Math.max(
            0,
            Number(
              batch.progress_percent
            )
          )
        )
      : (
          total > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  completed / total * 100
                )
              )
            : 0
        );

  return {
    total,
    completed,
    percent,
    parentTotal,
    parentCompleted,
    childTotal,
    childCompleted,
    running:
      firstNumber([
        batch?.running_count
      ]),
    queued:
      firstNumber([
        batch?.queued_count
      ]),
    failed:
      firstNumber([
        batch?.failed_count
      ])
  };
}


function formatProgressCount(
  completed,
  total
) {
  if (total <= 0) {
    return "-";
  }

  return `${completed} / ${total}件`;
}


function showImportProgress() {
  importProgress?.classList.remove(
    "hidden"
  );
}


function hideImportProgress() {
  importProgress?.classList.add(
    "hidden"
  );
}


function renderImportProgress(
  batch
) {
  if (!batch) {
    return;
  }

  const progress =
    getTaskProgress(batch);

  const status =
    normalizeTaskStatus(
      batch.status
    );

  showImportProgress();

  if (importProgressStatus) {
    importProgressStatus.textContent =
      formatTaskStatus(status) ||
      "確認中";
  }

  if (importProgressCount) {
    importProgressCount.textContent =
      formatProgressCount(
        progress.completed,
        progress.total
      );
  }

  if (importProgressRunning) {
    importProgressRunning.textContent =
      `${progress.running}件`;
  }

  if (importProgressQueued) {
    importProgressQueued.textContent =
      `${progress.queued}件`;
  }

  if (importProgressFailed) {
    importProgressFailed.textContent =
      `${progress.failed}件`;
  }

  if (importProgressBar) {
    importProgressBar.value =
      progress.percent;

    importProgressBar.setAttribute(
      "aria-valuenow",
      String(
        progress.percent.toFixed(1)
      )
    );
  }

  if (importProgressPercent) {
    importProgressPercent.textContent =
      `${progress.percent.toFixed(1)}%`;
  }

  if (importProgressParent) {
    importProgressParent.textContent =
      formatProgressCount(
        progress.parentCompleted,
        progress.parentTotal
      );
  }

  if (importProgressChild) {
    importProgressChild.textContent =
      formatProgressCount(
        progress.childCompleted,
        progress.childTotal
      );
  }

  if (importProgressUpdatedAt) {
    importProgressUpdatedAt.textContent =
      formatDateTime(
        batch.updated_at ||
        new Date().toISOString()
      );
  }

  if (
    status === "completed" ||
    status === "failed" ||
    status === "enqueue_failed"
  ) {
    stopProgressAutoRefresh();

    if (importProgressNextRefresh) {
      importProgressNextRefresh.textContent =
        "自動更新停止";
    }
  }
}


function updateProgressCountdown() {
  if (!importProgressNextRefresh) {
    return;
  }

  if (!nextProgressRefreshAt) {
    importProgressNextRefresh.textContent =
      "-";

    return;
  }

  const remainingSeconds =
    Math.max(
      0,
      Math.ceil(
        (
          nextProgressRefreshAt -
          Date.now()
        ) / 1000
      )
    );

  importProgressNextRefresh.textContent =
    `${remainingSeconds}秒後`;
}


function scheduleNextProgressRefresh() {
  if (!activeBatchId) {
    return;
  }

  window.clearTimeout(
    progressRefreshTimer
  );

  window.clearInterval(
    progressCountdownTimer
  );

  nextProgressRefreshAt =
    Date.now() +
    TASK_POLL_INTERVAL_MS;

  updateProgressCountdown();

  progressCountdownTimer =
    window.setInterval(
      updateProgressCountdown,
      1000
    );

  progressRefreshTimer =
    window.setTimeout(
      async () => {
        await refreshActiveTaskProgress({
          scheduleNext: true
        });
      },
      TASK_POLL_INTERVAL_MS
    );
}


function stopProgressAutoRefresh() {
  window.clearTimeout(
    progressRefreshTimer
  );

  window.clearInterval(
    progressCountdownTimer
  );

  progressRefreshTimer =
    null;

  progressCountdownTimer =
    null;

  nextProgressRefreshAt =
    null;
}


async function refreshActiveTaskProgress({
  scheduleNext = false
} = {}) {
  if (
    !activeBatchId ||
    progressRefreshInFlight
  ) {
    return null;
  }

  progressRefreshInFlight =
    true;

  if (btnRefreshProgress) {
    btnRefreshProgress.disabled =
      true;
  }

  try {
    const batch =
      await getImportBatchProgress(
        activeBatchId
      );

    renderImportProgress(
      batch
    );

    const status =
      normalizeTaskStatus(
        batch.status
      );

    if (status !== lastBatchStatus) {
      writeLog(
        `取込状態: ${
          formatTaskStatus(status)
        }`
      );

      lastBatchStatus =
        status;
    }

    if (
      status === "completed" &&
      activeTaskDataSource?.data_source_id
    ) {
      writeLog(
        "データ取得が完了しました。"
      );

      await loadImportedItems(
        activeTaskDataSource.data_source_id
      );
    }

    if (status === "failed") {
      writeLog(
        `データ取得でエラーが発生しました。失敗件数: ${
          firstNumber([
            batch.failed_count
          ])
        }件`
      );
    }

    if (
      scheduleNext &&
      status !== "completed" &&
      status !== "failed"
    ) {
      scheduleNextProgressRefresh();
    }

    return batch;

  } catch (error) {
    console.error(
      "進捗取得エラー:",
      error
    );

    writeLog(
      `進捗取得失敗: ${
        error.message
      }`
    );

    if (scheduleNext) {
      scheduleNextProgressRefresh();
    }

    return null;

  } finally {
    progressRefreshInFlight =
      false;

    if (btnRefreshProgress) {
      btnRefreshProgress.disabled =
        false;
    }
  }
}


async function getImportBatchProgress(
  batchId
) {
  const url =
    new URL(
      `${API_BASE}/data-import/tasks`
    );

  url.searchParams.set(
    "batch_id",
    batchId
  );

  return await authenticatedJsonOrThrow(
    url.toString(),
    {
      method: "GET",
      cache: "no-store"
    }
  );
}


async function handleQueuedImportResult({
  result,
  dataSource
}) {
  if (!result?.batch_id) {
    throw new Error(
      "取込バッチIDを取得できませんでした。"
    );
  }

  if (result.task_id) {
    writeLog(
      `ルートタスクID: ${result.task_id}`
    );
  }

  writeLog(
    `バッチID: ${result.batch_id}`
  );

  writeLog(
    `取込状態: ${
      formatTaskStatus(
        result.status
      )
    }`
  );

  if (result.queue_id) {
    writeLog(
      `キュー: ${result.queue_id}`
    );
  }

  if (
    result.task_concurrency !== undefined &&
    result.task_concurrency !== null
  ) {
    writeLog(
      `並列数: ${result.task_concurrency}`
    );
  }

  activeBatchId =
    result.batch_id;

  activeTaskDataSource =
    dataSource;

  lastBatchStatus =
    normalizeTaskStatus(
      result.status
    );

  renderImportProgress({
    ...result,
    status:
      result.status ||
      "queued",
    total_count: 1,
    finished_count: 0,
    root_total: 1,
    root_completed: 0,
    detail_total: 0,
    detail_completed: 0,
    running_count: 0,
    queued_count: 1,
    failed_count: 0,
    progress_percent: 0
  });

  showApiImportMessage(
    "データ取得を受け付けました。進捗は30秒ごとに更新します。"
  );

  await refreshActiveTaskProgress({
    scheduleNext: true
  });

  return result;
}


function setDeleteButtonsDisabled(
  disabled
) {
  deleteDataSourceButtons.forEach(
    button => {
      button.disabled =
        disabled;
    }
  );
}


function setImportButtonsDisabled(
  disabled
) {
  [
    btnUploadRegister,
    btnUrlRegister,
    btnApiRegister,
    btnKokkaiRegister,
    btnFetchDatasets
  ]
    .filter(
      button =>
        button
    )
    .forEach(
      button => {
        button.disabled =
          disabled;
      }
    );
}


function setAllActionButtonsDisabled(
  disabled
) {
  setImportButtonsDisabled(
    disabled
  );

  setDeleteButtonsDisabled(
    disabled
  );
}


function showProcessingOverlay(
  message
) {
  let overlay =
    document.getElementById(
      "dataImportProcessingOverlay"
    );

  if (!overlay) {
    overlay =
      document.createElement(
        "div"
      );

    overlay.id =
      "dataImportProcessingOverlay";

    overlay.innerHTML = `
      <div class="data-import-processing-message">
        <div class="data-import-processing-spinner"></div>
        <div id="dataImportProcessingText"></div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );
  }

  const messageElement =
    document.getElementById(
      "dataImportProcessingText"
    );

  if (messageElement) {
    messageElement.textContent =
      String(
        message ||
        "処理中です。完了までお待ちください。"
      );
  }

  overlay.classList.add(
    "is-visible"
  );
}


function hideProcessingOverlay() {
  document
    .getElementById(
      "dataImportProcessingOverlay"
    )
    ?.classList.remove(
      "is-visible"
    );
}


async function deleteSelectedDataSourceData() {
  if (!currentDataSource) {
    alert(
      "データソースを選択してください。"
    );

    return;
  }

  const dataSourceId =
    String(
      currentDataSource.data_source_id ||
      ""
    ).trim();

  const dataSourceName =
    String(
      currentDataSource.data_source_name ||
      dataSourceId
    ).trim();

  if (!dataSourceId) {
    alert(
      "データソースIDを取得できません。"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `データソース「${dataSourceName}」配下の取込データをすべて削除します。\n\n` +
      "削除対象:\n" +
      "・data_import（子・孫を含む）\n" +
      "・raw_documents（recordsを含む）\n" +
      "・Cloud Storage の imports\n" +
      "・取込タスク／解析バッチ\n\n" +
      "この操作は取り消せません。"
    );

  if (!confirmed) {
    return;
  }

  stopProgressAutoRefresh();

  setAllActionButtonsDisabled(
    true
  );

  showProcessingOverlay(
    `「${dataSourceName}」のデータを削除しています。完了までお待ちください。`
  );

  writeLog(
    `全削除開始: ${dataSourceName}`
  );

  try {
    const result =
      await authenticatedJsonOrThrow(
        `${API_BASE}/data-import/data-source/${encodeURIComponent(dataSourceId)}`,
        {
          method:
            "DELETE"
        }
      );

    activeBatchId =
      "";

    activeTaskDataSource =
      null;

    lastBatchStatus =
      "";

    hideImportProgress();
    clearApiImportResult();
    clearSelectedFile();

    if (
      normalizeAuthenticationMethodKey(
        currentDataSource.authentication_method_key
      ) === "file_upload"
    ) {
      await loadUploadedFiles();

    } else {
      await loadImportedItems(
        dataSourceId
      );
    }

    const deleted =
      result.deleted_counts ||
      {};

    writeLog(
      "全削除完了: " +
      `data_import=${deleted.data_import || 0}件, ` +
      `raw_documents=${deleted.raw_documents || 0}件, ` +
      `storage=${deleted.storage_objects || 0}件, ` +
      `import_tasks=${deleted.import_tasks || 0}件, ` +
      `analysis_batches=${deleted.analysis_batches || 0}件`
    );

    alert(
      "データソース配下の取込・解析データを削除しました。"
    );

  } catch (error) {
    console.error(
      "データソース配下削除エラー:",
      error
    );

    writeLog(
      `全削除失敗: ${error.message || error}`
    );

    alert(
      error.message ||
      "データソース配下の削除に失敗しました。"
    );

  } finally {
    hideProcessingOverlay();

    setAllActionButtonsDisabled(
      false
    );
  }
}


async function runSelectedDataImport() {
  try {
    if (currentImportMethod === "file_upload") {
      const idToken =
        await getCurrentIdToken();

      const result =
        await runFileUploadImport({
          idToken
        });

      if (
        result?.status !==
        "cancelled"
      ) {
        clearSelectedFile();
        await loadUploadedFiles();
      }

      return;
    }

    if (!currentDataSource) {
      throw new Error(
        "データソースを選択してください。"
      );
    }

    const dataSource =
      await loadDataSourceDetail(
        currentDataSource
      );

    currentDataSource =
      dataSource;

    const idToken =
      await getCurrentIdToken();

    writeLog(
      `データソース: ${dataSource.data_source_name}`
    );

    const methodKey =
      normalizeAuthenticationMethodKey(
        dataSource.authentication_method_key
      );

    switch (methodKey) {
      case "file_upload":
        throw new Error(
          "ファイルアップロードではデータソースを使用しません。"
        );

      case "none": {
        const result =
          await runNoneImport({
            idToken,
            dataSource
          });

        await handleQueuedImportResult({
          result,
          dataSource
        });

        return;
      }

      case "basic": {
        const result =
          await runBasicImport({
            idToken,
            dataSource
          });

        await handleQueuedImportResult({
          result,
          dataSource
        });

        return;
      }

      case "client_credentials": {
        const result =
          await runClientCredentialsImport({
            idToken,
            dataSource
          });

        await handleQueuedImportResult({
          result,
          dataSource
        });

        return;
      }

      default:
        throw new Error(
          `未対応の認証方式です: ${
            methodKey ||
            "未設定"
          }`
        );
    }

  } catch (error) {
    console.error(
      error
    );

    writeLog(
      `処理失敗: ${error.message}`
    );

    alert(
      `処理失敗: ${error.message}`
    );
  }
}


async function runFileUploadImport({
  idToken
}) {
  validateModule(
    window.DataImportFileUpload,
    "data_import_file_upload.js"
  );

  return await window.DataImportFileUpload.run({
    apiBase:
      API_BASE,

    idToken,

    writeLog
  });
}


async function runNoneImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportNone,
    "data_import_none.js"
  );

  return await window.DataImportNone.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


async function runBasicImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportBasic,
    "data_import_basic.js"
  );

  return await window.DataImportBasic.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


async function runClientCredentialsImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportClientCredentials,
    "data_import_client_credentials.js"
  );

  return await window.DataImportClientCredentials.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


function validateModule(
  moduleObject,
  fileName
) {
  if (
    !moduleObject ||
    typeof moduleObject.run !==
      "function"
  ) {
    throw new Error(
      `${fileName}が読み込まれていません。`
    );
  }
}


function isFileUploadSelection(
  detail
) {
  const values = [
    detail?.authenticationMethodKey,
    detail?.authentication_method_key,
    detail?.dataSourceId,
    detail?.sourceId,
    detail?.sourceKey,
    detail?.dataSourceName,
    detail?.sourceLabel,
    detail?.dataSource?.authentication_method_key,
    detail?.dataSource?.authenticationMethodKey,
    detail?.dataSource?.data_source_id,
    detail?.dataSource?.data_source_name
  ];

  return values.some(
    value => {
      const normalized = String(
        value || ""
      )
        .trim()
        .toLowerCase()
        .replace(/-/g, "_");

      return (
        normalized === "file_upload" ||
        normalized === "file" ||
        normalized === "ファイルアップロード"
      );
    }
  );
}


function bindToolbarEvents() {
  document.addEventListener(
    "toolbar:ready",
    event => {
      const detail =
        event.detail ||
        {};

      sourceMap =
        detail.sourceMap ||
        {};

      currentDataSource =
        null;

      currentImportMethod =
        "";

      clearSelectedFile();
      clearApiImportResult();
      stopProgressAutoRefresh();
      activeBatchId = "";
      activeTaskDataSource = null;
      lastBatchStatus = "";
      hideImportProgress();
      showEmptyPanel();

      if (detail.error) {
        writeLog(
          `データソース取得失敗: ${
            detail.error.message ||
            detail.error
          }`
        );
      }
    }
  );

  document.addEventListener(
    "toolbar:source-change",
    async event => {
      const detail =
        event.detail ||
        {};

      if (isFileUploadSelection(detail)) {
        currentImportMethod =
          "file_upload";

        currentDataSource =
          null;

        clearSelectedFile();
        clearApiImportResult();
        stopProgressAutoRefresh();
        activeBatchId = "";
        activeTaskDataSource = null;
        lastBatchStatus = "";
        hideImportProgress();
        hideAllPanels();
        panelUpload?.classList.remove(
          "hidden"
        );

        await loadUploadedFiles();
        return;
      }

      const sourceId =
        detail.dataSourceId ||
        detail.sourceId ||
        detail.sourceKey ||
        "";

      if (!sourceId) {
        currentDataSource =
          null;

        currentImportMethod =
          "";

        clearSelectedFile();
        clearApiImportResult();
        stopProgressAutoRefresh();
        activeBatchId = "";
        activeTaskDataSource = null;
        lastBatchStatus = "";
        hideImportProgress();
        showEmptyPanel();

        return;
      }

      const source =
        detail.dataSource ||
        sourceMap[sourceId] ||
        {
          data_source_id:
            sourceId,

          data_source_name:
            detail.dataSourceName ||
            detail.sourceLabel ||
            "",

          source_type:
            detail.sourceType ||
            "",

          authentication_method_key:
            detail.authenticationMethodKey ||
            ""
        };

      clearSelectedFile();
      clearApiImportResult();
      stopProgressAutoRefresh();
      activeBatchId = "";
      activeTaskDataSource = null;
      lastBatchStatus = "";
      hideImportProgress();

      try {
        currentDataSource =
          await loadDataSourceDetail(
            source
          );

        currentImportMethod =
          normalizeAuthenticationMethodKey(
            currentDataSource.authentication_method_key
          );

        showPanelForDataSource(
          currentDataSource
        );

        const methodKey =
          normalizeAuthenticationMethodKey(
            currentDataSource.authentication_method_key
          );

        if (
          methodKey === "file_upload"
        ) {
          const extensions =
            getAllowedExtensions(
              currentDataSource
            );

          writeLog(
            extensions.length > 0
              ? (
                  "対象拡張子: " +
                  extensions
                    .map(
                      extension =>
                        `.${extension}`
                    )
                    .join(
                      ", "
                    )
                )
              : "対象拡張子が設定されていません。"
          );

          await loadUploadedFiles();

        } else {
          await loadImportedItems(
            currentDataSource.data_source_id
          );
        }

      } catch (error) {
        currentDataSource =
          null;

        showEmptyPanel();

        console.error(
          "データソース詳細取得エラー:",
          error
        );

        alert(
          error.message ||
          "データソース設定を取得できませんでした。"
        );
      }
    }
  );
}


function bindActionButton(
  button
) {
  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      button.disabled =
        true;

      try {
        await runSelectedDataImport();

      } finally {
        button.disabled =
          false;
      }
    }
  );
}


async function initialize() {
  hideAllPanels();
  panelUpload?.classList.remove(
    "hidden"
  );

  bindToolbarEvents();
  bindDataImportResultEvent();

  bindActionButton(
    btnUploadRegister
  );

  bindActionButton(
    btnUrlRegister
  );

  bindActionButton(
    btnApiRegister
  );

  bindActionButton(
    btnKokkaiRegister
  );

  bindActionButton(
    btnFetchDatasets
  );

  uploadFileInput?.addEventListener(
    "change",
    syncSelectedFileName
  );

  btnClearLog?.addEventListener(
    "click",
    clearLog
  );

  btnRefreshProgress?.addEventListener(
    "click",
    async () => {
      await refreshActiveTaskProgress({
        scheduleNext: true
      });
    }
  );


  deleteDataSourceButtons.forEach(
    button => {
      button.addEventListener(
        "click",
        deleteSelectedDataSourceData
      );
    }
  );

  if (
    typeof window.renderPageToolbar !==
    "function"
  ) {
    throw new Error(
      "common_toolbar.jsを読み込めませんでした。"
    );
  }

  await window.renderPageToolbar({
    mountId:
      "pageToolbar",

    title:
      "データ取込",

    showSourceSelect:
      true,

    showDbSelect:
      false,

    enableDbAutoLoad:
      false,

    actions: [
      {
        id:
          "btnMenu",

        label:
          "メニュー"
      },
      {
        id:
          "btnLogout",

        label:
          "ログアウト"
      }
    ]
  });
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    initialize().catch(
      error => {
        console.error(
          "データ取込画面初期化エラー:",
          error
        );

        alert(
          error.message ||
          "画面の初期化に失敗しました。"
        );
      }
    );
  }
);
