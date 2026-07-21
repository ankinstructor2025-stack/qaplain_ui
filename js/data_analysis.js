import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";


const API_BASE = API_BASE_URL;

const reloadButton =
    document.getElementById(
        "btnReload"
    );

const messageArea =
    document.getElementById(
        "messageArea"
    );

const fileCount =
    document.getElementById(
        "fileCount"
    );

const completedCount =
    document.getElementById(
        "completedCount"
    );

const pendingCount =
    document.getElementById(
        "pendingCount"
    );

const failedCount =
    document.getElementById(
        "failedCount"
    );

const tableWrap =
    document.querySelector(
        ".analysis-table-wrap"
    );

const actionArea =
    document.querySelector(
        ".analysis-actions"
    );


let currentDataSourceId = "";
let currentSummary = null;
let batchButton = null;


function normalizeText(value) {

    return String(
        value ?? ""
    ).trim();

}


function createBatchButton() {

    batchButton =
        document.createElement(
            "button"
        );

    batchButton.id =
        "btnBatchAnalyze";

    batchButton.type =
        "button";

    batchButton.className =
        "btn btn-primary";

    batchButton.textContent =
        "未解析ファイルを一括解析";

    batchButton.disabled =
        true;

    batchButton.addEventListener(
        "click",
        () => {

            startBatch().catch(
                handleError
            );

        }
    );

    actionArea.insertBefore(
        batchButton,
        reloadButton
    );

}


function hideFileTable() {

    if (tableWrap) {
        tableWrap.style.display =
            "none";
    }

}


function updateSummary(
    summary
) {

    const total =
        Number(
            summary?.total_count || 0
        );

    const completed =
        Number(
            summary?.completed_count || 0
        );

    const pending =
        Number(
            summary?.pending_count || 0
        );

    const running =
        Number(
            summary?.running_count || 0
        );

    const failed =
        Number(
            summary?.failed_count || 0
        );

    fileCount.textContent =
        `${total} 件`;

    completedCount.textContent =
        `${completed} 件`;

    pendingCount.textContent =
        `${pending + running} 件`;

    failedCount.textContent =
        `${failed} 件`;

    if (batchButton) {

        batchButton.disabled =
            !currentDataSourceId
            || pending <= 0
            || running > 0;

        batchButton.textContent =
            running > 0
            ? `解析中 ${running}件`
            : `未解析${pending}件を一括解析`;

    }

}


function getLatestBatchMessage(
    summary
) {

    const batch =
        summary?.latest_batch;

    if (!batch) {
        return "";
    }

    const status =
        normalizeText(
            batch.status
        );

    const total =
        Number(
            batch.total_count || 0
        );

    const completed =
        Number(
            batch.completed_count || 0
        );

    const failed =
        Number(
            batch.failed_count || 0
        );

    const queued =
        Number(
            batch.queued_count || 0
        );

    if (
        status === "queued"
        || status === "dispatching"
    ) {

        return (
            "一括解析を準備しています。"
        );

    }

    if (status === "running") {

        return (
            `一括解析中: `
            + `${completed + failed}`
            + ` / ${total}件`
            + `（TASK登録 ${queued}件）`
        );

    }

    if (
        status === "completed"
        || status ===
            "completed_with_errors"
    ) {

        return (
            `最新ジョブ完了: `
            + `${completed}件成功、`
            + `${failed}件エラー`
        );

    }

    if (status === "failed") {

        return (
            batch.error_message
            || "最新の一括解析は失敗しました。"
        );

    }

    return "";

}


async function loadSummary() {

    if (!currentDataSourceId) {

        currentSummary = null;

        updateSummary({
            total_count:
                0,
            completed_count:
                0,
            pending_count:
                0,
            running_count:
                0,
            failed_count:
                0
        });

        reloadButton.disabled =
            true;

        messageArea.textContent =
            "データソースを選択してください。";

        return;

    }

    reloadButton.disabled =
        true;

    if (batchButton) {
        batchButton.disabled =
            true;
    }

    messageArea.textContent =
        "解析状況を読み込んでいます。";

    try {

        currentSummary =
            await authenticatedJsonOrThrow(
                (
                    `${API_BASE}/data-raw/summary`
                    + `?data_source_id=`
                    + encodeURIComponent(
                        currentDataSourceId
                    )
                ),
                {
                    method:
                        "GET"
                }
            );

        updateSummary(
            currentSummary
        );

        const latestMessage =
            getLatestBatchMessage(
                currentSummary
            );

        messageArea.textContent =
            latestMessage
            || (
                `${Number(
                    currentSummary.total_count
                    || 0
                )}件のファイルが`
                + "解析対象です。"
            );

    } finally {

        reloadButton.disabled =
            false;

    }

}


async function startBatch() {

    if (!currentDataSourceId) {
        return;
    }

    const pendingCountValue =
        Number(
            currentSummary
            ?.pending_count
            || 0
        );

    if (pendingCountValue <= 0) {

        alert(
            "未解析ファイルはありません。"
        );

        return;

    }

    const confirmed =
        confirm(
            `${pendingCountValue}件を`
            + "一括解析します。"
        );

    if (!confirmed) {
        return;
    }

    batchButton.disabled =
        true;

    reloadButton.disabled =
        true;

    messageArea.textContent =
        "一括解析を受け付けています。";

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE}/data-raw/batch`,
                {
                    method:
                        "POST",
                    body:
                        JSON.stringify({
                            data_source_id:
                                currentDataSourceId
                        })
                }
            );

        messageArea.textContent =
            result.message
            || "一括解析を受け付けました。";

        alert(
            "一括解析を受け付けました。"
            + "\n進捗は再読込または"
            + "ジョブ監視で確認してください。"
        );

        await loadSummary();

    } finally {

        reloadButton.disabled =
            false;

    }

}


function bindEvents() {

    reloadButton.addEventListener(
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
                    detail.dataSourceId
                    || detail.sourceId
                    || detail.sourceKey
                );

            loadSummary().catch(
                handleError
            );

        }
    );

}


function handleError(error) {

    console.error(
        "データ解析画面エラー:",
        error
    );

    messageArea.textContent =
        error.message
        || "処理中にエラーが発生しました。";

    alert(
        error.message
        || "処理中にエラーが発生しました。"
    );

}


async function initialize() {

    await waitForLogin();

    hideFileTable();
    createBatchButton();
    bindEvents();

    if (
        typeof window.renderPageToolbar
        !== "function"
    ) {

        throw new Error(
            "common_toolbar.jsを"
            + "読み込めませんでした。"
        );

    }

    await window.renderPageToolbar({
        mountId:
            "pageToolbar",
        title:
            "データ解析",
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
            handleError
        );

    }
);
