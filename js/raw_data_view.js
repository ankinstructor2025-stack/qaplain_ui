import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";


const documentHeader =
    document.getElementById(
        "documentHeader"
    );

const documentList =
    document.getElementById(
        "documentList"
    );

const documentCount =
    document.getElementById(
        "documentCount"
    );

const recordList =
    document.getElementById(
        "recordList"
    );

const recordCount =
    document.getElementById(
        "recordCount"
    );

const recordDetail =
    document.getElementById(
        "recordDetail"
    );


let sourceMap = {};
let selectedDataSource = null;
let selectedDocumentId = "";
let selectedRecordId = "";
let parentDisplayFields = [];


async function handleDataSourceChanged(
    detail
) {

    const dataSourceId =
        String(
            detail?.dataSourceId ||
            detail?.sourceId ||
            detail?.sourceKey ||
            ""
        ).trim();

    selectedDataSource =
        detail?.dataSource ||
        sourceMap[dataSourceId] ||
        (
            dataSourceId
                ? {
                    data_source_id:
                        dataSourceId,
                    data_source_name:
                        detail?.dataSourceName ||
                        detail?.sourceLabel ||
                        ""
                }
                : null
        );

    selectedDocumentId =
        "";

    selectedRecordId =
        "";

    clearRecords();
    clearDetail();

    if (!selectedDataSource || !dataSourceId) {

        parentDisplayFields =
            [];

        renderDocumentHeader();

        showDocumentMessage(
            "データソースを選択してください。"
        );

        return;

    }

    try {

        await loadDataSourceDetail(
            dataSourceId
        );

        await loadDocuments();

    } catch (error) {

        console.error(
            "データソース変更処理エラー:",
            error
        );

        parentDisplayFields =
            [];

        renderDocumentHeader();

        showDocumentMessage(
            error.message ||
            "解析データを取得できませんでした。"
        );

    }

}


async function loadDataSourceDetail(
    dataSourceId
) {

    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/data-sources/${encodeURIComponent(dataSourceId)}`,
            {
                method: "GET"
            }
        );

    const detail =
        result.data_source ||
        result;

    selectedDataSource =
        {
            ...selectedDataSource,
            ...detail
        };

    parentDisplayFields =
        Array.isArray(
            selectedDataSource.parent_display_fields
        )
            ? selectedDataSource.parent_display_fields
            : [];

    parentDisplayFields.sort(
        (left, right) =>
            Number(
                left.display_order || 0
            ) -
            Number(
                right.display_order || 0
            )
    );

    renderDocumentHeader();

}


async function loadDocuments() {

    if (!selectedDataSource) {
        return;
    }

    showDocumentMessage(
        "読込中..."
    );

    const dataSourceId =
        getDataSourceId(
            selectedDataSource
        );

    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/raw-data-view/documents?data_source_id=${encodeURIComponent(dataSourceId)}`,
            {
                method: "GET"
            }
        );

    const documents =
        Array.isArray(result)
            ? result
            : result.documents || [];

    renderDocuments(
        documents
    );

}


function renderDocumentHeader() {

    documentHeader.innerHTML =
        "";

    const fields =
        getEffectiveParentFields();

    fields.forEach(
        field => {

            const cell =
                document.createElement(
                    "div"
                );

            cell.style.width =
                field.width;

            cell.textContent =
                field.label;

            documentHeader.appendChild(
                cell
            );

        }
    );

}


function renderDocuments(
    documents
) {

    documentList.innerHTML =
        "";

    documentCount.textContent =
        `${documents.length}件`;

    if (!documents.length) {

        showDocumentMessage(
            "対象データはありません。"
        );

        return;

    }

    const fields =
        getEffectiveParentFields();

    documents.forEach(
        documentData => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "data-view-row";

            row.dataset.documentId =
                documentData.document_id;

            if (
                documentData.document_id ===
                selectedDocumentId
            ) {
                row.classList.add(
                    "selected"
                );
            }

            fields.forEach(
                field => {

                    const cell =
                        document.createElement(
                            "div"
                        );

                    cell.className =
                        "data-view-cell";

                    cell.style.width =
                        field.width;

                    cell.textContent =
                        formatValue(
                            getPathValue(
                                documentData,
                                field.path
                            )
                        );

                    row.appendChild(
                        cell
                    );

                }
            );

            row.addEventListener(
                "click",
                () => {
                    selectDocument(
                        documentData.document_id,
                        row
                    );
                }
            );

            documentList.appendChild(
                row
            );

        }
    );

}


async function selectDocument(
    documentId,
    selectedRow
) {

    selectedDocumentId =
        documentId;

    selectedRecordId =
        "";

    documentList
        .querySelectorAll(
            ".data-view-row"
        )
        .forEach(
            row => {
                row.classList.remove(
                    "selected"
                );
            }
        );

    selectedRow.classList.add(
        "selected"
    );

    clearDetail();

    await loadRecords(
        documentId
    );

}


async function loadRecords(
    documentId
) {

    showRecordMessage(
        "読込中..."
    );

    const dataSourceId =
        getDataSourceId(
            selectedDataSource
        );

    if (!dataSourceId) {
        throw new Error(
            "データソースを選択してください。"
        );
    }

    const url =
        new URL(
            `${API_BASE_URL}/raw-data-view/documents/${encodeURIComponent(documentId)}/records`
        );

    url.searchParams.set(
        "data_source_id",
        dataSourceId
    );

    const result =
        await authenticatedJsonOrThrow(
            url.toString(),
            {
                method: "GET"
            }
        );

    const records =
        Array.isArray(result)
            ? result
            : result.records || [];

    renderRecords(
        records
    );

}


function renderRecords(
    records
) {

    recordList.innerHTML =
        "";

    recordCount.textContent =
        `${records.length}件`;

    if (!records.length) {

        showRecordMessage(
            "子レコードはありません。"
        );

        return;

    }

    records.forEach(
        record => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "data-view-row";

            row.dataset.recordId =
                record.record_id;

            appendRecordCell(
                row,
                formatValue(
                    record.sequence
                ),
                "12%"
            );

            appendRecordCell(
                row,
                formatValue(
                    record.title
                ),
                "42%"
            );

            appendRecordCell(
                row,
                formatValue(
                    record.start_page
                ),
                "18%"
            );

            appendRecordCell(
                row,
                formatValue(
                    record.end_page
                ),
                "18%"
            );

            appendRecordCell(
                row,
                "表示",
                "10%"
            );

            row.addEventListener(
                "click",
                () => {
                    selectRecord(
                        record,
                        row
                    );
                }
            );

            recordList.appendChild(
                row
            );

        }
    );

}


function appendRecordCell(
    row,
    value,
    width
) {

    const cell =
        document.createElement(
            "div"
        );

    cell.className =
        "data-view-cell";

    cell.style.width =
        width;

    cell.textContent =
        value;

    row.appendChild(
        cell
    );

}


function selectRecord(
    record,
    selectedRow
) {

    selectedRecordId =
        record.record_id;

    recordList
        .querySelectorAll(
            ".data-view-row"
        )
        .forEach(
            row => {
                row.classList.remove(
                    "selected"
                );
            }
        );

    selectedRow.classList.add(
        "selected"
    );

    renderRecordDetail(
        record
    );

}


function renderRecordDetail(
    record
) {

    recordDetail.innerHTML =
        "";

    const meta =
        document.createElement(
            "div"
        );

    meta.className =
        "data-view-meta";

    appendMeta(
        meta,
        "タイトル",
        record.title
    );

    appendMeta(
        meta,
        "順番",
        record.sequence
    );

    appendMeta(
        meta,
        "開始ページ",
        record.start_page
    );

    appendMeta(
        meta,
        "終了ページ",
        record.end_page
    );

    appendMeta(
        meta,
        "分割方式",
        getPathValue(
            record,
            "metadata.split_method"
        )
    );

    recordDetail.appendChild(
        meta
    );

    const content =
        document.createElement(
            "div"
        );

    content.className =
        "data-view-detail";

    content.textContent =
        formatValue(
            record.content
        );

    recordDetail.appendChild(
        content
    );

}


function appendMeta(
    container,
    label,
    value
) {

    const labelElement =
        document.createElement(
            "div"
        );

    labelElement.className =
        "data-view-meta-label";

    labelElement.textContent =
        label;

    const valueElement =
        document.createElement(
            "div"
        );

    valueElement.className =
        "data-view-meta-value";

    valueElement.textContent =
        formatValue(
            value
        );

    container.appendChild(
        labelElement
    );

    container.appendChild(
        valueElement
    );

}


async function handleReload() {

    if (!selectedDataSource) {

        showDocumentMessage(
            "データソースを選択してください。"
        );

        clearRecords();
        clearDetail();

        return;

    }

    await loadDocuments();

    clearRecords();
    clearDetail();

}


function getEffectiveParentFields() {

    if (parentDisplayFields.length) {

        const count =
            parentDisplayFields.length;

        const width =
            `${100 / count}%`;

        return parentDisplayFields.map(
            field => ({
                label:
                    field.label ||
                    field.path ||
                    "項目",
                path:
                    field.path,
                width
            })
        );

    }

    return [
        {
            label: "ファイル名／タイトル",
            path: "display_name",
            width: "42%"
        },
        {
            label: "形式",
            path: "file_extension",
            width: "14%"
        },
        {
            label: "レコード数",
            path: "record_count",
            width: "16%"
        },
        {
            label: "解析日時",
            path: "analyzed_at",
            width: "28%"
        }
    ];

}


function getPathValue(
    source,
    path
) {

    if (!source || !path) {
        return "";
    }

    return String(path)
        .split(".")
        .reduce(
            (current, key) => {

                if (
                    current === null ||
                    current === undefined
                ) {
                    return undefined;
                }

                return current[key];

            },
            source
        );

}


function formatValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    if (
        typeof value === "object"
    ) {
        return JSON.stringify(
            value,
            null,
            2
        );
    }

    return String(
        value
    );

}


function getDataSourceId(
    dataSource
) {

    return String(
        dataSource.data_source_id ||
        dataSource.id ||
        ""
    );

}


function clearRecords() {

    recordCount.textContent =
        "0件";

    showRecordMessage(
        "親データを選択してください。"
    );

}


function clearDetail() {

    recordDetail.innerHTML =
        "";

    const empty =
        document.createElement(
            "div"
        );

    empty.className =
        "data-view-empty";

    empty.textContent =
        "子レコードを選択してください。";

    recordDetail.appendChild(
        empty
    );

}


function showDocumentMessage(
    message
) {

    documentList.innerHTML =
        "";

    documentCount.textContent =
        "0件";

    const empty =
        document.createElement(
            "div"
        );

    empty.className =
        "data-view-empty";

    empty.textContent =
        message;

    documentList.appendChild(
        empty
    );

}


function showRecordMessage(
    message
) {

    recordList.innerHTML =
        "";

    recordCount.textContent =
        "0件";

    const empty =
        document.createElement(
            "div"
        );

    empty.className =
        "data-view-empty";

    empty.textContent =
        message;

    recordList.appendChild(
        empty
    );

}


function resetView() {

    selectedDataSource =
        null;

    selectedDocumentId =
        "";

    selectedRecordId =
        "";

    parentDisplayFields =
        [];

    renderDocumentHeader();

    showDocumentMessage(
        "データソースを選択してください。"
    );

    clearRecords();
    clearDetail();

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

            resetView();

            if (detail.error) {

                console.error(
                    "データソース取得エラー:",
                    detail.error
                );

            }

        }
    );

    document.addEventListener(
        "toolbar:source-change",
        event => {

            handleDataSourceChanged(
                event.detail ||
                {}
            ).catch(
                error => {

                    console.error(
                        "データソース変更処理エラー:",
                        error
                    );

                    showDocumentMessage(
                        error.message ||
                        "解析データを取得できませんでした。"
                    );

                    clearRecords();
                    clearDetail();

                }
            );

        }
    );

}


function bindReloadButton() {

    const button =
        document.getElementById(
            "btnReload"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            button.disabled =
                true;

            try {

                await handleReload();

            } catch (error) {

                console.error(
                    "解析データ再読込エラー:",
                    error
                );

                alert(
                    error.message ||
                    "解析データを再読込できませんでした。"
                );

            } finally {

                button.disabled =
                    false;

            }

        }
    );

}


async function initialize() {

    await waitForLogin();

    bindToolbarEvents();

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
            "解析データ照会",

        showSourceSelect:
            true,

        showDbSelect:
            false,

        enableDbAutoLoad:
            false,

        actions: [
            {
                id:
                    "btnReload",

                label:
                    "再読込"
            },
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

    bindReloadButton();

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialize().catch(
            error => {

                console.error(
                    "解析データ照会画面初期化エラー:",
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
