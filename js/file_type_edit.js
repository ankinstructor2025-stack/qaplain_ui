import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const saveButton =
    document.getElementById(
        "saveButton"
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


const extension =
    normalizeExtension(
        new URLSearchParams(
            location.search
        ).get(
            "extension"
        )
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

        saveButton.addEventListener(
            "click",
            handleSave
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        if (extension) {

            await loadFileType();

        } else {

            initializeNewFileType();

        }

    } catch (error) {

        console.error(
            "拡張子編集画面初期化エラー:",
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


function initializeNewFileType() {

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

    extensionInput.focus();

}


async function loadFileType() {

    setButtonState(
        true,
        "読込中..."
    );

    try {

        const fileType =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/file-types/${
                    encodeURIComponent(
                        extension
                    )
                }`,
                {
                    method: "GET"
                }
            );

        extensionInput.value =
            fileType.extension || "";

        displayNameInput.value =
            fileType.display_name || "";

        mimeTypesInput.value =
            Array.isArray(
                fileType.mime_types
            )
                ? fileType.mime_types.join(
                    "\n"
                )
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

        extensionInput.readOnly =
            true;

    } finally {

        setButtonState(
            false
        );

    }

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
            extension
        );

    const url =
        isUpdate
            ? `${API_BASE_URL}/file-types/${
                encodeURIComponent(
                    extension
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

        location.href =
            "./file_type_maintenance.html";

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


function createRequestBody() {

    const mimeTypes =
        mimeTypesInput.value
            .split(
                /\r?\n|,/
            )
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
        body.max_file_size_mb < 1 ||
        body.max_file_size_mb > 10000
    ) {

        return (
            "最大ファイルサイズは1から10000までの整数で入力してください。"
        );

    }

    if (
        !Number.isInteger(
            body.sort_order
        ) ||
        body.sort_order < 0 ||
        body.sort_order > 9999
    ) {

        return (
            "表示順は0から9999までの整数で入力してください。"
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


function setButtonState(
    disabled,
    text = "保存"
) {

    saveButton.disabled =
        disabled;

    backButton.disabled =
        disabled;

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
            ? text
            : "保存";

}


function handleBack() {

    location.href =
        "./file_type_maintenance.html";

}