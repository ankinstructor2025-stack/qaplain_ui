import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const dataSourceList =
    document.getElementById(
        "dataSourceList"
    );

const addDataSourceButton =
    document.getElementById(
        "addDataSourceButton"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await waitForLogin();

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {

            alert(
                "管理権限がありません。"
            );

            location.href =
                "./menu.html";

            return;

        }

        addDataSourceButton.addEventListener(
            "click",
            handleAddDataSource
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadDataSources();

    } catch (error) {

        console.error(
            "データソース管理画面初期化エラー:",
            error
        );

        alert(
            error.message ||
            "画面の初期化に失敗しました。"
        );

        location.href =
            "./index.html";

    }

}


async function loadDataSources() {

    showLoading();

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/data-sources`,
                {
                    method: "GET"
                }
            );

        const dataSources =
            Array.isArray(result)
                ? result
                : result.data_sources || [];

        renderDataSources(
            dataSources
        );

    } catch (error) {

        console.error(
            "データソース一覧取得エラー:",
            error
        );

        showMessage(
            error.message ||
            "データソース一覧の取得に失敗しました。"
        );

    }

}


function renderDataSources(
    dataSources
) {

    dataSourceList.innerHTML =
        "";

    if (
        !Array.isArray(dataSources) ||
        dataSources.length === 0
    ) {

        showMessage(
            "データソースは登録されていません。"
        );

        return;

    }

    dataSources.forEach(
        dataSource => {

            const row =
                createDataSourceRow(
                    dataSource
                );

            dataSourceList.appendChild(
                row
            );

        }
    );

}


function createDataSourceRow(
    dataSource
) {

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    row.appendChild(
        createTextColumn(
            getDataSourceName(
                dataSource
            ),
            "22%"
        )
    );

    row.appendChild(
        createTextColumn(
            getSourceTypeLabel(
                dataSource.source_type
            ),
            "14%"
        )
    );

    row.appendChild(
        createTextColumn(
            getAuthenticationMethodLabel(
                dataSource
            ),
            "18%"
        )
    );

    row.appendChild(
        createTextColumn(
            getConnectionTarget(
                dataSource
            ),
            "28%"
        )
    );

    row.appendChild(
        createTextColumn(
            getEnabledLabel(
                dataSource.enabled
            ),
            "8%"
        )
    );

    row.appendChild(
        createActionColumn(
            dataSource
        )
    );

    return row;

}


function createTextColumn(
    text,
    width
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        width;

    column.textContent =
        text || "";

    return column;

}


function createActionColumn(
    dataSource
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "10%";

    column.className =
        "list-actions";

    const editButton =
        document.createElement(
            "button"
        );

    editButton.type =
        "button";

    editButton.className =
        "btn btn-small";

    editButton.textContent =
        "編集";

    editButton.addEventListener(
        "click",
        () => {
            handleEditDataSource(
                dataSource
            );
        }
    );

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "btn btn-small btn-danger";

    deleteButton.textContent =
        "削除";

    deleteButton.addEventListener(
        "click",
        () => {
            handleDeleteDataSource(
                dataSource
            );
        }
    );

    column.appendChild(
        editButton
    );

    column.appendChild(
        deleteButton
    );

    return column;

}


function getDataSourceName(
    dataSource
) {

    return (
        dataSource.data_source_name ||
        dataSource.name ||
        ""
    );

}


function getDataSourceId(
    dataSource
) {

    return (
        dataSource.data_source_id ||
        dataSource.id ||
        dataSource.document_id ||
        ""
    );

}


function getSourceTypeLabel(
    sourceType
) {

    const normalizedSourceType =
        String(
            sourceType || ""
        )
            .trim()
            .toLowerCase();

    const labels = {
        file:
            "ファイル",
        mail:
            "メール",
        url:
            "公開URL",
        api:
            "公開API"
    };

    return (
        labels[normalizedSourceType] ||
        sourceType ||
        ""
    );

}


function getAuthenticationMethodLabel(
    dataSource
) {

    if (
        dataSource.authentication_method_name
    ) {

        return (
            dataSource.authentication_method_name
        );

    }

    const methodKey =
        String(
            dataSource.authentication_method_key ||
            dataSource.method_key ||
            ""
        )
            .trim()
            .toLowerCase()
            .replaceAll(
                "-",
                "_"
            );

    const labels = {
        none:
            "認証なし",
        basic:
            "ベーシック認証",
        credential:
            "クレデンシャル",
        credentials:
            "クレデンシャル",
        client_credentials:
            "クライアントクレデンシャル"
    };

    return (
        labels[methodKey] ||
        methodKey ||
        ""
    );

}


function getConnectionTarget(
    dataSource
) {

    if (
        dataSource.endpoint_url
    ) {

        return (
            dataSource.endpoint_url
        );

    }

    if (
        dataSource.target_url
    ) {

        return (
            dataSource.target_url
        );

    }

    const sourceType =
        String(
            dataSource.source_type || ""
        )
            .trim()
            .toLowerCase();

    if (sourceType === "file") {

        return (
            formatExtensions(
                dataSource.file_extensions
            )
        );

    }

    if (sourceType === "mail") {

        return (
            formatExtensions(
                dataSource.file_extensions
            )
        );

    }

    return "";

}


function formatExtensions(
    extensions
) {

    if (
        Array.isArray(extensions)
    ) {

        return (
            extensions.join(
                ", "
            )
        );

    }

    return (
        extensions || ""
    );

}


function getEnabledLabel(
    enabled
) {

    return (
        enabled === false
            ? "無効"
            : "有効"
    );

}


function handleAddDataSource() {

    location.href =
        "./data_source_edit.html";

}


function handleEditDataSource(
    dataSource
) {

    const dataSourceId =
        getDataSourceId(
            dataSource
        );

    if (!dataSourceId) {

        alert(
            "データソースIDを取得できません。"
        );

        return;

    }

    location.href =
        `./data_source_edit.html?id=${encodeURIComponent(
            dataSourceId
        )}`;

}


async function handleDeleteDataSource(
    dataSource
) {

    const dataSourceId =
        getDataSourceId(
            dataSource
        );

    if (!dataSourceId) {

        alert(
            "データソースIDを取得できません。"
        );

        return;

    }

    const dataSourceName =
        getDataSourceName(
            dataSource
        );

    const confirmed =
        confirm(
            `データソース「${dataSourceName}」を削除しますか？`
        );

    if (!confirmed) {

        return;

    }

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/data-sources/${encodeURIComponent(
                    dataSourceId
                )}`,
                {
                    method: "DELETE"
                }
            );

        alert(
            result.message ||
            "データソースを削除しました。"
        );

        await loadDataSources();

    } catch (error) {

        console.error(
            "データソース削除エラー:",
            error
        );

        alert(
            error.message ||
            "データソースの削除に失敗しました。"
        );

    }

}


function showLoading() {

    showMessage(
        "読み込み中です。"
    );

}


function showMessage(
    message
) {

    dataSourceList.innerHTML =
        "";

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "100%";

    column.textContent =
        message;

    row.appendChild(
        column
    );

    dataSourceList.appendChild(
        row
    );

}


function handleBack() {

    location.href =
        "./menu.html";

}