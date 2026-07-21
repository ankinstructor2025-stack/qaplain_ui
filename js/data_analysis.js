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

const fileTableBody =
    document.getElementById(
        "fileTableBody"
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


let currentDataSourceId = "";
let items = [];


function normalizeText(value) {

    return String(
        value ?? ""
    ).trim();

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function getItemId(item) {

    return normalizeText(
        item.item_id ||
        item.file_id ||
        item.id
    );

}


function getFileName(item) {

    return (
        normalizeText(
            item.file_name
        ) ||
        normalizeText(
            item.display_name
        ) ||
        normalizeText(
            item.title
        ) ||
        "名称なし"
    );

}


function getExtension(item) {

    return normalizeText(
        item.extension
    ).replace(
        /^\./,
        ""
    );

}


function getSourceType(item) {

    const importMethod =
        normalizeText(
            item.import_method
        ).toLowerCase();

    if (
        importMethod === "file_upload" ||
        importMethod === "upload" ||
        normalizeText(
            item.file_id
        )
    ) {

        return "uploaded_file";

    }

    return "api_import";

}


function getAnalysisStatus(item) {

    const status =
        normalizeText(
            item.analysis_status
        ).toLowerCase();

    if (status === "completed") {
        return "解析済み";
    }

    if (status === "failed") {
        return "エラー";
    }

    if (status === "running") {
        return "解析中";
    }

    return "未解析";

}


function getImportMethodLabel(item) {

    const sourceType =
        getSourceType(item);

    if (sourceType === "uploaded_file") {
        return "ファイルアップロード";
    }

    return "外部データ取得";

}


function renderEmpty(message) {

    fileTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">
            ${escapeHtml(message)}
          </td>
        </tr>
    `;

}


function updateSummary() {

    const completed =
        items.filter(
            item =>
                normalizeText(
                    item.analysis_status
                ).toLowerCase()
                === "completed"
        ).length;

    const failed =
        items.filter(
            item =>
                normalizeText(
                    item.analysis_status
                ).toLowerCase()
                === "failed"
        ).length;

    const pending =
        items.length -
        completed -
        failed;

    fileCount.textContent =
        `${items.length} 件`;

    completedCount.textContent =
        `${completed} 件`;

    pendingCount.textContent =
        `${Math.max(pending, 0)} 件`;

    failedCount.textContent =
        `${failed} 件`;

}


function renderItems() {

    updateSummary();

    if (!items.length) {

        renderEmpty(
            "解析対象のファイルがありません。"
        );

        return;

    }

    fileTableBody.innerHTML =
        items.map(
            item => {

                const itemId =
                    getItemId(item);

                const sourceType =
                    getSourceType(item);

                const recordCount =
                    Number(
                        item.analysis_record_count
                        || 0
                    );

                const disabled =
                    !itemId
                    ? "disabled"
                    : "";

                return `
                    <tr>
                      <td>
                        ${escapeHtml(
                            getFileName(item)
                        )}
                      </td>
                      <td>
                        .${escapeHtml(
                            getExtension(item)
                        )}
                      </td>
                      <td>
                        ${escapeHtml(
                            getImportMethodLabel(item)
                        )}
                      </td>
                      <td class="status-text">
                        ${escapeHtml(
                            getAnalysisStatus(item)
                        )}
                      </td>
                      <td>
                        ${recordCount
                            ? `${recordCount} 件`
                            : "-"
                        }
                      </td>
                      <td>
                        <button
                            class="btn btn-primary"
                            type="button"
                            data-action="analyze"
                            data-source-type="${escapeHtml(
                                sourceType
                            )}"
                            data-source-id="${escapeHtml(
                                itemId
                            )}"
                            ${disabled}>
                          解析
                        </button>
                      </td>
                    </tr>
                `;

            }
        ).join("");

}


async function loadItems() {

    if (!currentDataSourceId) {

        items = [];

        renderEmpty(
            "データソースを選択してください。"
        );

        updateSummary();

        reloadButton.disabled =
            true;

        messageArea.textContent =
            "データソースを選択してください。";

        return;

    }

    reloadButton.disabled =
        true;

    messageArea.textContent =
        "対象ファイルを読み込んでいます。";

    try {

        const result =
            await authenticatedJsonOrThrow(
                (
                    `${API_BASE}/data-view/items`
                    + `?data_source_id=`
                    + encodeURIComponent(
                        currentDataSourceId
                    )
                ),
                {
                    method: "GET"
                }
            );

        items = Array.isArray(
            result.items
        )
            ? result.items
            : [];

        renderItems();

        messageArea.textContent =
            `${items.length}件のファイルを表示しています。`;

    } finally {

        reloadButton.disabled =
            false;

    }

}


async function analyzeItem(
    sourceType,
    sourceId,
    button
) {

    if (!sourceId) {
        return;
    }

    button.disabled =
        true;

    messageArea.textContent =
        "ファイルを解析しています。";

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE}/data-raw/process`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        source_type:
                            sourceType,
                        source_id:
                            sourceId,
                        overwrite:
                            true
                    })
                }
            );

        alert(
            (
                "データ解析が完了しました。\n"
                + `登録件数: `
                + `${Number(
                    result.record_count || 0
                )}件`
            )
        );

        await loadItems();

    } catch (error) {

        console.error(
            "データ解析エラー:",
            error
        );

        alert(
            error.message ||
            "データ解析に失敗しました。"
        );

        messageArea.textContent =
            error.message ||
            "データ解析に失敗しました。";

    } finally {

        button.disabled =
            false;

    }

}


function bindEvents() {

    reloadButton.addEventListener(
        "click",
        () => {

            loadItems().catch(
                handleError
            );

        }
    );

    fileTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    '[data-action="analyze"]'
                );

            if (!button) {
                return;
            }

            analyzeItem(
                button.dataset.sourceType,
                button.dataset.sourceId,
                button
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

            loadItems().catch(
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
        error.message ||
        "処理中にエラーが発生しました。";

    alert(
        error.message ||
        "処理中にエラーが発生しました。"
    );

}


async function initialize() {

    await waitForLogin();

    bindEvents();

    if (
        typeof window.renderPageToolbar
        !== "function"
    ) {

        throw new Error(
            "common_toolbar.jsを読み込めませんでした。"
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
