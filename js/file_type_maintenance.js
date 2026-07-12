import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const newButton =
    document.getElementById(
        "newButton"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const deleteButton =
    document.getElementById(
        "deleteButton"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const extensionInput =
    document.getElementById(
        "extension"
    );

const displayNameInput =
    document.getElementById(
        "displayName"
    );

const mimeTypesInput =
    document.getElementById(
        "mimeTypes"
    );

const parserTypeInput =
    document.getElementById(
        "parserType"
    );

const maxFileSizeMbInput =
    document.getElementById(
        "maxFileSizeMb"
    );

const enabledInput =
    document.getElementById(
        "enabled"
    );

const sortOrderInput =
    document.getElementById(
        "sortOrder"
    );

const fileTypeList =
    document.getElementById(
        "fileTypeList"
    );


let selectedExtension =
    null;


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

        if (
            !session.is_system_administrator
        ) {

            alert(
                "システム管理者権限がありません。"
            );

            location.href =
                "./menu.html";

            return;

        }

        newButton.addEventListener(
            "click",
            initializeNew
        );

        saveButton.addEventListener(
            "click",
            handleSave
        );

        deleteButton.addEventListener(
            "click",
            handleDelete
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        initializeNew();

        await loadFileTypes();

    } catch (error) {

        console.error(
            "拡張子管理画面初期化エラー:",
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


async function loadFileTypes() {

    showListMessage(
        "読み込み中..."
    );

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/file-types`,
                {
                    method: "GET"
                }
            );

        const fileTypes =
            Array.isArray(result)
                ? result
                : result.file_types || [];

        renderFileTypes(
            fileTypes
        );

    } catch (error) {

        console.error(
            "拡張子一覧取得エラー:",
            error
        );

        showListMessage(
            error.message ||
            "拡張子一覧を取得できませんでした。"
        );

    }

}


function renderFileTypes(
    fileTypes
) {

    fileTypeList.innerHTML =
        "";

    if (fileTypes.length === 0) {

        showListMessage(
            "拡張子が登録されていません。"
        );

        return;

    }

    fileTypes.forEach(
        fileType => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "list-row";

            row.appendChild(
                createColumn(
                    `.${fileType.extension || ""}`,
                    "10%"
                )
            );

            row.appendChild(
                createColumn(
                    fileType.display_name || "",
                    "18%"
                )
            );

            row.appendChild(
                createColumn(
                    formatMimeTypes(
                        fileType.mime_types
                    ),
                    "30%"
                )
            );

            row.appendChild(
                createColumn(
                    fileType.parser_type || "",
                    "14%"
                )
            );

            row.appendChild(
                createColumn(
                    String(
                        fileType.max_file_size_mb ?? ""
                    ),
                    "10%"
                )
            );

            row.appendChild(
                createColumn(
                    fileType.enabled
                        ? "有効"
                        : "無効",
                    "8%"
                )
            );

            row.appendChild(
                createActionColumn(
                    fileType
                )
            );

            fileTypeList.appendChild(
                row
            );

        }
    );

}


function createColumn(
    value,
    width
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        width;

    column.textContent =
        value;

    return column;

}


function createActionColumn(
    fileType
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "10%";

    column.className =
        "list-row-actions";

    const editButton =
        document.createElement(
            "button"
        );

    editButton.type =
        "button";

    editButton.className =
        "btn";

    editButton.textContent =
        "編集";

    editButton.addEventListener(
        "click",
        () => {
            selectFileType(
                fileType
            );
        }
    );

    column.appendChild(
        editButton
    );

    return column;

}


function selectFileType(
    fileType
) {

    selectedExtension =
        fileType.extension;

    extensionInput.value =
        fileType.extension || "";

    displayNameInput.value =
        fileType.display_name || "";

    mimeTypesInput.value =
        Array.isArray(
            fileType.mime_types
        )
            ? fileType.mime_types.join("\n")
            : "";

    parserTypeInput.value =
        fileType.parser_type || "";

    maxFileSizeMbInput.value =
        fileType.max_file_size_mb ?? 50;

    enabledInput.value =
        fileType.enabled
            ? "true"
            : "false";

    sortOrderInput.value =
        fileType.sort_order ?? 10;

    /*
     * FirestoreのドキュメントIDとして
     * 拡張子を使用するため、
     * 登録後の拡張子は変更不可。
     */
    extensionInput.readOnly =
        true;

    deleteButton.disabled =
        false;

}


function initializeNew() {

    selectedExtension =
        null;

    extensionInput.value =
        "";

    displayNameInput.value =
        "";

    mimeTypesInput.value =
        "";

    parserTypeInput.value =
        "";

    maxFileSizeMbInput.value =
        "50";

    enabledInput.value =
        "true";

    sortOrderInput.value =
        "10";

    extensionInput.readOnly =
        false;

    deleteButton.disabled =
        true;

    extensionInput.focus();

}


async function handleSave() {

    const body =
        createRequestBody();

    const validationMessage =
        validateInput(
            body
        );

    if (validationMessage) {

        alert(
            validationMessage
        );

        return;

    }

    const isUpdate =
        Boolean(
            selectedExtension
        );

    const url =
        isUpdate
            ? `${API_BASE_URL}/file-types/${
                encodeURIComponent(
                    selectedExtension
                )
            }`
            : `${API_BASE_URL}/file-types`;

    const method =
        isUpdate
            ? "PUT"
            : "POST";

    setButtonState(
        true,
        "保存中..."
    );

    try {

        await authenticatedJsonOrThrow(
            url,
            {
                method,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(
                        body
                    )
            }
        );

        alert(
            "保存しました。"
        );

        initializeNew();

        await loadFileTypes();

    } catch (error) {

        console.error(
            "拡張子保存エラー:",
            error
        );

        alert(
            error.message ||
            "拡張子を保存できませんでした。"
        );

    } finally {

        setButtonState(
            false
        );

    }

}


async function handleDelete() {

    if (!selectedExtension) {

        alert(
            "削除する拡張子を選択してください。"
        );

        return;

    }

    const confirmed =
        confirm(
            `.${selectedExtension}を削除しますか？`
        );

    if (!confirmed) {
        return;
    }

    setButtonState(
        true,
        "削除中..."
    );

    try {

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/file-types/${
                encodeURIComponent(
                    selectedExtension
                )
            }`,
            {
                method: "DELETE"
            }
        );

        alert(
            "削除しました。"
        );

        initializeNew();

        await loadFileTypes();

    } catch (error) {

        console.error(
            "拡張子削除エラー:",
            error
        );

        alert(
            error.message ||
            "拡張子を削除できませんでした。"
        );

    } finally {

        setButtonState(
            false
        );

    }

}


function createRequestBody() {

    const mimeTypes =
        mimeTypesInput.value
            .split(/\r?\n|,/)
            .map(
                value => value.trim()
            )
            .filter(
                value => value
            );

    return {
        extension:
            normalizeExtension(
                extensionInput.value
            ),

        display_name:
            displayNameInput.value.trim(),

        mime_types:
            mimeTypes,

        parser_type:
            parserTypeInput.value.trim(),

        max_file_size_mb:
            Number(
                maxFileSizeMbInput.value
            ),

        enabled:
            enabledInput.value === "true",

        sort_order:
            Number(
                sortOrderInput.value
            )
    };

}


function validateInput(
    body
) {

    if (!body.extension) {

        return (
            "拡張子を入力してください。"
        );

    }

    if (
        !/^[a-z0-9]+$/.test(
            body.extension
        )
    ) {

        return (
            "拡張子は半角英数字で入力してください。"
        );

    }

    if (!body.display_name) {

        return (
            "表示名を入力してください。"
        );

    }

    if (
        body.mime_types.length === 0
    ) {

        return (
            "MIMEタイプを入力してください。"
        );

    }

    if (!body.parser_type) {

        return (
            "解析方式を入力してください。"
        );

    }

    if (
        !Number.isInteger(
            body.max_file_size_mb
        ) ||
        body.max_file_size_mb < 1
    ) {

        return (
            "最大ファイルサイズは1以上の整数で入力してください。"
        );

    }

    if (
        !Number.isInteger(
            body.sort_order
        ) ||
        body.sort_order < 0
    ) {

        return (
            "表示順は0以上の整数で入力してください。"
        );

    }

    return "";

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


function formatMimeTypes(
    mimeTypes
) {

    if (!Array.isArray(mimeTypes)) {
        return "";
    }

    return mimeTypes.join(", ");

}


function setButtonState(
    disabled,
    saveText = "保存"
) {

    newButton.disabled =
        disabled;

    saveButton.disabled =
        disabled;

    backButton.disabled =
        disabled;

    deleteButton.disabled =
        disabled || !selectedExtension;

    extensionInput.disabled =
        disabled;

    displayNameInput.disabled =
        disabled;

    mimeTypesInput.disabled =
        disabled;

    parserTypeInput.disabled =
        disabled;

    maxFileSizeMbInput.disabled =
        disabled;

    enabledInput.disabled =
        disabled;

    sortOrderInput.disabled =
        disabled;

    saveButton.textContent =
        disabled
            ? saveText
            : "保存";

}


function showListMessage(
    message
) {

    fileTypeList.innerHTML =
        "";

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    row.textContent =
        message;

    fileTypeList.appendChild(
        row
    );

}


function handleBack() {

    location.href =
        "./system_menu.html";

}