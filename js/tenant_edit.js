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
    document.getElementById("saveButton");

const backButton =
    document.getElementById("backButton");

const tenantNameInput =
    document.getElementById("tenantName");

const parentUserInput =
    document.getElementById("parentUser");

const startDateInput =
    document.getElementById("startDate");

const endDateInput =
    document.getElementById("endDate");

const tenantId =
    new URLSearchParams(
        location.search
    ).get("id");

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

            alert("管理権限がありません。");

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

        if (tenantId) {

            await loadTenant();

        } else {

            parentUserInput.value =
                auth.currentUser?.email || "";

        }

    } catch (error) {

        console.error(
            "初期表示エラー:",
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

async function loadTenant() {

    setButtonState(
        true,
        "読込中..."
    );

    try {

        const tenant =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/tenants/${
                    encodeURIComponent(tenantId)
                }`,
                {
                    method: "GET"
                }
            );

        tenantNameInput.value =
            tenant.tenant_name || "";

        parentUserInput.value =
            tenant.parent_user || "";

        startDateInput.value =
            formatDate(tenant.start_date);

        endDateInput.value =
            formatDate(tenant.end_date);

    } finally {

        setButtonState(false);

    }

}

async function handleSave() {

    const body = {
        tenant_name:
            tenantNameInput.value.trim(),

        start_date:
            startDateInput.value,

        end_date:
            endDateInput.value || null
    };

    const validationMessage =
        validateInput(body);

    if (validationMessage) {

        alert(validationMessage);

        return;

    }

    const url =
        tenantId
            ? `${API_BASE_URL}/tenants/${
                encodeURIComponent(tenantId)
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
                    JSON.stringify(body)
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

        setButtonState(false);

    }

}

function validateInput(
    body
) {

    if (!body.tenant_name) {
        return "テナント名を入力してください。";
    }

    if (!body.start_date) {
        return "利用開始日を入力してください。";
    }

    if (
        body.end_date &&
        body.start_date > body.end_date
    ) {
        return "利用終了日は利用開始日以降の日付を入力してください。";
    }

    return "";

}

function setButtonState(
    disabled,
    text = "保存"
) {

    saveButton.disabled =
        disabled;

    backButton.disabled =
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

    return String(value)
        .substring(0, 10);

}

function handleBack() {

    location.href =
        "./tenant_maintenance.html";

}
