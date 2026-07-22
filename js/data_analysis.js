import {
  API_BASE_URL
} from "./config.js";

import {
  waitForLogin,
  authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";


const API_BASE =
  API_BASE_URL;

const TASK_POLL_INTERVAL_MS =
  30 * 1000;


const batchButton =
  document.getElementById(
    "btnBatchAnalyze"
  );

const resetButton =
  document.getElementById(
    "btnResetAnalysis"
  );

const refreshButton =
  document.getElementById(
    "btnRefreshProgress"
  );

const messageArea =
  document.getElementById(
    "messageArea"
  );

const progressStatus =
  document.getElementById(
    "analysisProgressStatus"
  );

const progressCount =
  document.getElementById(
    "analysisProgressCount"
  );

const progressRunning =
  document.getElementById(
    "analysisProgressRunning"
  );

const progressQueued =
  document.getElementById(
    "analysisProgressQueued"
  );

const progressFailed =
  document.getElementById(
    "analysisProgressFailed"
  );

const progressBar =
  document.getElementById(
    "analysisProgressBar"
  );

const progressPercent =
  document.getElementById(
    "analysisProgressPercent"
  );

const progressUpdatedAt =
  document.getElementById(
    "analysisProgressUpdatedAt"
  );

const progressNextRefresh =
  document.getElementById(
    "analysisProgressNextRefresh"
  );


let currentDataSourceId = "";
let currentSummary = null;
let progressRefreshTimer = null;
let progressCountdownTimer = null;
let nextProgressRefreshAt = null;
let progressRefreshInFlight = false;


function normalizeText(
  value
) {
  return String(
    value ?? ""
  ).trim();
}


function normalizeStatus(
  value
) {
  return normalizeText(
    value
  ).toLowerCase();
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


function formatStatus(
  value
) {
  switch (normalizeStatus(value)) {
    case "queued":
    case "dispatching":
      return "待機中";

    case "running":
      return "解析中";

    case "completed":
      return "完了";

    case "completed_with_errors":
      return "完了（一部エラー）";

    case "failed":
    case "enqueue_failed":
      return "エラー";

    case "not_started":
    case "":
      return "未開始";

    default:
      return String(value || "");
  }
}


function formatDateTime(
  value
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
  ).format(date);
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


function getProgressValues(
  summary
) {
  const batch =
    summary?.latest_batch || {};

  const total =
    firstNumber([
      batch.total_count,
      summary?.total_count
    ]);

  const completed =
    firstNumber([
      batch.completed_count,
      summary?.completed_count
    ]);

  const failed =
    firstNumber([
      batch.failed_count,
      summary?.failed_count
    ]);

  const running =
    firstNumber([
      batch.running_count,
      summary?.running_count
    ]);

  const queued =
    firstNumber([
      batch.queued_count,
      summary?.pending_count
    ]);

  const finished =
    Math.min(
      total,
      completed + failed
    );

  const percent =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            finished / total * 100
          )
        )
      : 0;

  return {
    batch,
    status:
      normalizeStatus(batch.status),
    total,
    completed,
    failed,
    running,
    queued,
    finished,
    percent
  };
}


function isActiveStatus(
  status
) {
  return [
    "queued",
    "dispatching",
    "running"
  ].includes(
    normalizeStatus(status)
  );
}


function renderProgress(
  summary
) {
  const progress =
    getProgressValues(summary);

  progressStatus.textContent =
    formatStatus(progress.status);

  progressCount.textContent =
    formatProgressCount(
      progress.finished,
      progress.total
    );

  progressRunning.textContent =
    `${progress.running}件`;

  progressQueued.textContent =
    `${progress.queued}件`;

  progressFailed.textContent =
    `${progress.failed}件`;

  progressBar.value =
    progress.percent;

  progressBar.setAttribute(
    "aria-valuenow",
    String(
      progress.percent.toFixed(1)
    )
  );

  progressPercent.textContent =
    `${progress.percent.toFixed(1)}%`;

  progressUpdatedAt.textContent =
    formatDateTime(
      progress.batch.updated_at ||
      summary?.updated_at ||
      new Date().toISOString()
    );

  const pending =
    firstNumber([
      summary?.pending_count
    ]);

  batchButton.disabled =
    !currentDataSourceId ||
    pending <= 0 ||
    isActiveStatus(progress.status);

  batchButton.textContent =
    isActiveStatus(progress.status)
      ? `解析中 ${progress.running || progress.queued}件`
      : `未解析${pending}件を一括解析`;

  resetButton.disabled =
    !currentDataSourceId;

  refreshButton.disabled =
    !currentDataSourceId;

  if (isActiveStatus(progress.status)) {
    scheduleNextProgressRefresh();
  } else {
    stopProgressAutoRefresh();
    progressNextRefresh.textContent =
      "自動更新停止";
  }
}


function resetProgress() {
  stopProgressAutoRefresh();

  progressStatus.textContent =
    "未開始";

  progressCount.textContent =
    "-";

  progressRunning.textContent =
    "0件";

  progressQueued.textContent =
    "0件";

  progressFailed.textContent =
    "0件";

  progressBar.value =
    0;

  progressPercent.textContent =
    "0.0%";

  progressUpdatedAt.textContent =
    "-";

  progressNextRefresh.textContent =
    "-";

  batchButton.disabled =
    true;

  batchButton.textContent =
    "未解析ファイルを一括解析";

  resetButton.disabled =
    true;

  refreshButton.disabled =
    true;
}


function updateProgressCountdown() {
  if (!nextProgressRefreshAt) {
    progressNextRefresh.textContent =
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

  progressNextRefresh.textContent =
    `${remainingSeconds}秒後`;
}


function scheduleNextProgressRefresh() {
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
      () => {
        loadSummary().catch(
          handleError
        );
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

  progressRefreshTimer = null;
  progressCountdownTimer = null;
  nextProgressRefreshAt = null;
}


function getLatestBatchMessage(
  summary
) {
  const progress =
    getProgressValues(summary);

  if (!summary?.latest_batch) {
    return `${progress.total}件のファイルが解析対象です。`;
  }

  if (
    progress.status === "queued" ||
    progress.status === "dispatching"
  ) {
    return "一括解析を準備しています。";
  }

  if (progress.status === "running") {
    return (
      `一括解析中: ` +
      `${progress.finished} / ${progress.total}件`
    );
  }

  if (
    progress.status === "completed" ||
    progress.status === "completed_with_errors"
  ) {
    return (
      `最新ジョブ完了: ` +
      `${progress.completed}件成功、` +
      `${progress.failed}件エラー`
    );
  }

  if (progress.status === "failed") {
    return (
      progress.batch.error_message ||
      "最新の一括解析は失敗しました。"
    );
  }

  return `${progress.total}件のファイルが解析対象です。`;
}


async function loadSummary() {
  if (!currentDataSourceId) {
    currentSummary = null;
    resetProgress();

    messageArea.textContent =
      "データソースを選択してください。";

    return;
  }

  if (progressRefreshInFlight) {
    return;
  }

  progressRefreshInFlight =
    true;

  refreshButton.disabled =
    true;

  batchButton.disabled =
    true;

  messageArea.textContent =
    "解析状況を読み込んでいます。";

  try {
    currentSummary =
      await authenticatedJsonOrThrow(
        (
          `${API_BASE}/data-raw/summary` +
          `?data_source_id=` +
          encodeURIComponent(
            currentDataSourceId
          )
        ),
        {
          method: "GET",
          cache: "no-store"
        }
      );

    renderProgress(
      currentSummary
    );

    messageArea.textContent =
      getLatestBatchMessage(
        currentSummary
      );

  } finally {
    progressRefreshInFlight =
      false;

    refreshButton.disabled =
      !currentDataSourceId;
  }
}


async function startBatch() {
  if (!currentDataSourceId) {
    return;
  }

  const pendingCount =
    firstNumber([
      currentSummary?.pending_count
    ]);

  if (pendingCount <= 0) {
    alert(
      "未解析ファイルはありません。"
    );
    return;
  }

  const confirmed =
    confirm(
      `${pendingCount}件を一括解析します。`
    );

  if (!confirmed) {
    return;
  }

  batchButton.disabled =
    true;

  refreshButton.disabled =
    true;

  messageArea.textContent =
    "一括解析を受け付けています。";

  try {
    const result =
      await authenticatedJsonOrThrow(
        `${API_BASE}/data-raw/batch`,
        {
          method: "POST",
          body: JSON.stringify({
            data_source_id:
              currentDataSourceId
          })
        }
      );

    messageArea.textContent =
      result.message ||
      "一括解析を受け付けました。";

    await loadSummary();

  } finally {
    refreshButton.disabled =
      !currentDataSourceId;
  }
}


async function resetAnalysis() {
  if (!currentDataSourceId) {
    return;
  }

  const confirmed =
    confirm(
      "解析進捗をリセットします。\n" +
      "解析済み状態と一括解析履歴が削除され、" +
      "対象ファイルは未解析に戻ります。"
    );

  if (!confirmed) {
    return;
  }

  stopProgressAutoRefresh();

  batchButton.disabled =
    true;

  resetButton.disabled =
    true;

  refreshButton.disabled =
    true;

  messageArea.textContent =
    "解析進捗をリセットしています。";

  try {
    const result =
      await authenticatedJsonOrThrow(
        `${API_BASE}/data-raw/batch/reset`,
        {
          method: "POST",
          body: JSON.stringify({
            data_source_id:
              currentDataSourceId
          })
        }
      );

    currentSummary = null;

    resetProgress();

    messageArea.textContent =
      result.message ||
      "解析進捗をリセットしました。";

    await loadSummary();

  } finally {
    resetButton.disabled =
      !currentDataSourceId;

    refreshButton.disabled =
      !currentDataSourceId;
  }
}


function bindEvents() {
  batchButton.addEventListener(
    "click",
    () => {
      startBatch().catch(
        handleError
      );
    }
  );

  resetButton.addEventListener(
    "click",
    () => {
      resetAnalysis().catch(
        handleError
      );
    }
  );

  refreshButton.addEventListener(
    "click",
    () => {
      loadSummary().catch(
        handleError
      );
    }
  );

  document.addEventListener(
    "toolbar:source-change",
    event => {
      const detail =
        event.detail || {};

      currentDataSourceId =
        normalizeText(
          detail.dataSourceId ||
          detail.sourceId ||
          detail.sourceKey
        );

      resetProgress();

      loadSummary().catch(
        handleError
      );
    }
  );
}


function handleError(
  error
) {
  console.error(
    "データ解析画面エラー:",
    error
  );

  stopProgressAutoRefresh();

  progressNextRefresh.textContent =
    "自動更新停止";

  messageArea.textContent =
    error.message ||
    "処理中にエラーが発生しました。";

  alert(
    error.message ||
    "処理中にエラーが発生しました。"
  );
}


async function initialize() {
  await waitForLogin();

  resetProgress();
  bindEvents();

  if (
    typeof window.renderPageToolbar !==
    "function"
  ) {
    throw new Error(
      "common_toolbar.jsを読み込めませんでした。"
    );
  }

  await window.renderPageToolbar({
    mountId: "pageToolbar",
    title: "データ解析",
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


document.addEventListener(
  "DOMContentLoaded",
  () => {
    initialize().catch(
      handleError
    );
  }
);
