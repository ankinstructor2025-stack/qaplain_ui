import {
    auth
} from "./firebase-config.js";

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

const tenantNameInput =
    document.getElementById(
        "tenantName"
    );

const parentUserInput =
    document.getElementById(
        "parentUser"
    );

const startDateInput =
    document.getElementById(
        "startDate"
    );

const endDateInput =
    document.getElementById(
        "endDate"
    );

const openaiApiKeyInput =
    document.getElementById(
        "openaiApiKey"
    );

const geminiApiKeyInput =
    document.getElementById(
        "geminiApiKey"
    );

const toggleOpenaiApiKeyButton =
    document.getElementById(
        "toggleOpenaiApiKeyButton"
    );

const toggleGeminiApiKeyButton =
    document.getElementById(
        "toggleGeminiApiKeyButton"
    );


const tenantId =
    new URLSearchParams(
        location.search
    ).get(
        "id"
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

        saveButton.addEventListener(
            "click",
            handleSave
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        toggleOpenaiApiKeyButton.addEventListener(
            "click",
            () => {
                toggleApiKeyVisibility(
                    openaiApiKeyInput,
                    toggleOpenaiApiKeyButton
                );
            }
        );

        toggleGeminiApiKeyButton.addEventListener(
            "click",
            () => {
                toggleApiKeyVisibility(
                    geminiApiKeyInput,
                    toggleGeminiApiKeyButton
                );
            }
        );

        if (tenantId) {

            await loadTenant();

        } else {

            initializeNewTenant();

        }

    } catch (error) {

        console.error(
            "テナント編集画面初期化エラー:",
            error
        );

        alert(
            error.message ||
            "画面の初期化に失敗しました。"
        );

        location.href =
            "./menu.html";

    }

}


function initializeNewTenant() {

    parentUserInput.value =
        auth.currentUser?.email || "";

    startDateInput.value =
        getTodayText();

    startDateInput.readOnly =
        false;

    resetApiKeyVisibility();

}


async function loadTenant() {

    setButtonState(
        true,
        "読込中..."
    );

    try {

        /*
         * API側で以下を確認した場合だけ、
         * 復号されたAPIキーの実値が返る。
         *
         * 1. ログインユーザーが管理権限を持つ
         * 2. ログインメールアドレスと
         *    tenant.parent_user が一致する
         */
        const tenant =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/tenants/${
                    encodeURIComponent(
                        tenantId
                    )
                }`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        tenantNameInput.value =
            tenant.tenant_name || "";

        parentUserInput.value =
            tenant.parent_user || "";

        startDateInput.value =
            formatDate(
                tenant.start_date
            );

        endDateInput.value =
            formatDate(
                tenant.end_date
            );

        openaiApiKeyInput.value =
            tenant.openai_api_key || "";

        geminiApiKeyInput.value =
            tenant.gemini_api_key || "";

        /*
         * 既存テナントは利用開始日を変更不可。
         */
        startDateInput.readOnly =
            true;

        resetApiKeyVisibility();

    } finally {

        setButtonState(
            false
        );

    }

}


async function handleSave() {

    const body = {

        tenant_name:
            tenantNameInput.value.trim(),

        start_date:
            startDateInput.value,

        end_date:
            endDateInput.value || null,

        openai_api_key:
            openaiApiKeyInput.value.trim() || null,

        gemini_api_key:
            geminiApiKeyInput.value.trim() || null

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

    const url =
        tenantId
            ? `${API_BASE_URL}/tenants/${
                encodeURIComponent(
                    tenantId
                )
            }`
            : `${API_BASE_URL}/tenants`;

    const method =
        tenantId
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
            "./tenant_maintenance.html";

    } catch (error) {

        console.error(
            "テナント保存エラー:",
            error
        );

        alert(
            error.message ||
            "テナントの保存に失敗しました。"
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

    if (!body.tenant_name) {

        return (
            "テナント名を入力してください。"
        );

    }

    if (!body.start_date) {

        return (
            "利用開始日を入力してください。"
        );

    }

    if (
        body.end_date &&
        body.start_date > body.end_date
    ) {

        return (
            "利用終了日は利用開始日以降の日付を入力してください。"
        );

    }

    return "";

}


function toggleApiKeyVisibility(
    input,
    button
) {

    const isPassword =
        input.type === "password";

    input.type =
        isPassword
            ? "text"
            : "password";

    button.textContent =
        isPassword
            ? "非表示"
            : "表示";

}


function resetApiKeyVisibility() {

    openaiApiKeyInput.type =
        "password";

    geminiApiKeyInput.type =
        "password";

    toggleOpenaiApiKeyButton.textContent =
        "表示";

    toggleGeminiApiKeyButton.textContent =
        "表示";

}


function setButtonState(
    disabled,
    text = "保存"
) {

    saveButton.disabled =
        disabled;

    backButton.disabled =
        disabled;

    toggleOpenaiApiKeyButton.disabled =
        disabled;

    toggleGeminiApiKeyButton.disabled =
        disabled;

    tenantNameInput.disabled =
        disabled;

    startDateInput.disabled =
        disabled;

    endDateInput.disabled =
        disabled;

    openaiApiKeyInput.disabled =
        disabled;

    geminiApiKeyInput.disabled =
        disabled;

    saveButton.textContent =
        disabled
            ? text
            : "保存";

}


function formatDate(
    value
) {

    if (!value) {
        return "";
    }

    return String(
        value
    ).substring(
        0,
        10
    );

}


function getTodayText() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}


function handleBack() {

    clearApiKeys();

    location.href =
        "./tenant_maintenance.html";

}


function clearApiKeys() {

    openaiApiKeyInput.value =
        "";

    geminiApiKeyInput.value =
        "";

}