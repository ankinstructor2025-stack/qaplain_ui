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

const methodKeyInput =
    document.getElementById(
        "methodKey"
    );

const displayNameInput =
    document.getElementById(
        "displayName"
    );

const descriptionInput =
    document.getElementById(
        "description"
    );

const enabledInput =
    document.getElementById(
        "enabled"
    );


const methodKey =
    normalizeMethodKey(
        new URLSearchParams(
            location.search
        ).get(
            "method_key"
        )
    );


const METHOD_DEFAULTS = {

    none: {
        displayName:
            "認証なし",

        description:
            "認証を使用せずにデータを取得します。"
    },

    basic: {
        displayName:
            "Basic認証",

        description:
            "ユーザー名とパスワードを使用して認証します。"
    },

    client_credentials: {
        displayName:
            "OAuth 2.0 クライアントクレデンシャル",

        description:
            "クライアントIDとクライアントシークレットを使用してアクセストークンを取得します。"
    }

};


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

        methodKeyInput.addEventListener(
            "input",
            handleMethodKeyChanged
        );

        if (methodKey) {

            await loadAuthenticationMethod();

        } else {

            initializeNewAuthenticationMethod();

        }

    } catch (error) {

        console.error(
            "認証方式編集画面初期化エラー:",
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


function initializeNewAuthenticationMethod() {

    methodKeyInput.value =
        "";

    displayNameInput.value =
        "";

    descriptionInput.value =
        "";

    enabledInput.value =
        "true";

    methodKeyInput.readOnly =
        false;

    methodKeyInput.focus();

}


function handleMethodKeyChanged() {

    const currentMethodKey =
        normalizeMethodKey(
            methodKeyInput.value
        );

    const defaults =
        METHOD_DEFAULTS[
            currentMethodKey
        ];

    if (!defaults) {
        return;
    }

    displayNameInput.value =
        defaults.displayName;

    descriptionInput.value =
        defaults.description;

}


async function loadAuthenticationMethod() {

    setButtonState(
        true,
        "読込中..."
    );

    try {

        const authenticationMethod =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/authentication-methods/${
                    encodeURIComponent(
                        methodKey
                    )
                }`,
                {
                    method: "GET"
                }
            );

        methodKeyInput.value =
            authenticationMethod.method_key || "";

        displayNameInput.value =
            authenticationMethod.display_name || "";

        descriptionInput.value =
            authenticationMethod.description || "";

        enabledInput.value =
            authenticationMethod.enabled
                ? "true"
                : "false";

        methodKeyInput.readOnly =
            true;

    } finally {

        setButtonState(
            false
        );

    }

}


async function handleSave() {

    const body = {

        method_key:
            normalizeMethodKey(
                methodKeyInput.value
            ),

        display_name:
            displayNameInput.value.trim(),

        description:
            descriptionInput.value.trim(),

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
            methodKey
        );

    const url =
        isUpdate
            ? `${API_BASE_URL}/authentication-methods/${
                encodeURIComponent(
                    methodKey
                )
            }`
            : `${API_BASE_URL}/authentication-methods`;

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
            "./authentication_method_maintenance.html";

    } catch (error) {

        console.error(
            "認証方式保存エラー:",
            error
        );

        alert(
            error.message ||
            "認証方式を保存できませんでした。"
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

    if (!body.method_key) {

        return (
            "認証方式キーを入力してください。"
        );

    }

    if (
        !/^[a-z0-9_]+$/.test(
            body.method_key
        )
    ) {

        return (
            "認証方式キーは半角英数字とアンダースコアで入力してください。"
        );

    }

    if (!body.display_name) {

        return (
            "表示名を入力してください。"
        );

    }

    return "";

}


function normalizeMethodKey(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[\s-]+/g,
            "_"
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

    methodKeyInput.disabled =
        disabled;

    displayNameInput.disabled =
        disabled;

    descriptionInput.disabled =
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
        "./authentication_method_maintenance.html";

}