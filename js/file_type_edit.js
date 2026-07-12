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

const enabledInput =
    document.getElementById(
        "enabled"
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

    enabledInput.value =
        "true";

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

        enabledInput.value =
            fileType.enabled
                ? "true"
                : "false";

        extensionInput.readOnly =
            true;

    } finally {

        setButtonState(
            false
        );

    }

}


async function handleSave() {

    const body = {

        extension:
            normalizeExtension(
                extensionInput.value
            ),

        enabled:
            enabledInput.value === "true"

    };

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

    enabledInput.disabled =
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