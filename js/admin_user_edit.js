import {
    API_BASE_URL
} from "./config.js";

import {
    authenticatedFetch,
    waitForLogin
} from "./common.js";


const saveButton =
    document.getElementById("saveButton");

const backButton =
    document.getElementById("backButton");

const userNameInput =
    document.getElementById("userName");

const emailInput =
    document.getElementById("email");

const tenantIdSelect =
    document.getElementById("tenantId");

const startDateInput =
    document.getElementById("startDate");

const endDateInput =
    document.getElementById("endDate");


const urlParameters =
    new URLSearchParams(
        window.location.search
    );

const adminUserId =
    urlParameters.get("id");


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await waitForLogin();

        const session =
            await getSession();

        if (
            !session.is_system_administrator
        ) {
            alert(
                "SYSTEM_ADMINISTRATOR権限がありません。"
            );

            window.location.href =
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

        await loadAvailableTenants();

        if (adminUserId) {
            await loadAdminUser();
        }

    } catch (error) {

        console.error(
            "初期表示エラー:",
            error
        );

        alert(
            error.message ||
            "初期化に失敗しました。"
        );

    }

}


async function getSession() {

    const response =
        await authenticatedFetch(
            `${API_BASE_URL}/session`,
            {
                method: "POST"
            }
        );

    if (!response.ok) {

        const message =
            await getErrorMessage(
                response,
                "セッション確認に失敗しました。"
            );

        throw new Error(
            message
        );
    }

    return await response.json();

}


async function loadAvailableTenants() {

    const response =
        await authenticatedFetch(
            `${API_BASE_URL}/admin-users/available-tenants`,
            {
                method: "GET"
            }
        );

    if (!response.ok) {

        const message =
            await getErrorMessage(
                response,
                "テナント一覧の取得に失敗しました。"
            );

        throw new Error(
            message
        );
    }

    const result =
        await response.json();

    const tenants =
        Array.isArray(result)
            ? result
            : result.tenants || [];

    tenantIdSelect.innerHTML =
        "";

    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "テナントを選択してください";

    tenantIdSelect.appendChild(
        placeholder
    );

    tenants.forEach(
        tenant => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                tenant.tenant_id || "";

            option.textContent =
                tenant.tenant_name ||
                tenant.tenant_id ||
                "";

            tenantIdSelect.appendChild(
                option
            );

        }
    );

}


async function loadAdminUser() {

    setButtonState(
        true,
        "読込中..."
    );

    try {

        const response =
            await authenticatedFetch(
                `${API_BASE_URL}/admin-users/${encodeURIComponent(
                    adminUserId
                )}`,
                {
                    method: "GET"
                }
            );

        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response,
                    "管理ユーザーの取得に失敗しました。"
                );

            throw new Error(
                message
            );
        }

        const user =
            await response.json();

        userNameInput.value =
            user.user_name ?? "";

        emailInput.value =
            user.email ?? "";

        tenantIdSelect.value =
            user.tenant_id ?? "";

        startDateInput.value =
            formatDateValue(
                user.start_date
            );

        endDateInput.value =
            formatDateValue(
                user.end_date
            );

    } finally {

        setButtonState(
            false
        );
    }

}


async function handleSave() {

    const inputData =
        getInputData();

    const validationMessage =
        validateInput(
            inputData
        );

    if (validationMessage) {
        alert(
            validationMessage
        );
        return;
    }

    setButtonState(
        true,
        "保存中..."
    );

    try {

        const isEditMode =
            Boolean(
                adminUserId
            );

        const url =
            isEditMode
                ? `${API_BASE_URL}/admin-users/${encodeURIComponent(
                    adminUserId
                )}`
                : `${API_BASE_URL}/admin-users`;

        const response =
            await authenticatedFetch(
                url,
                {
                    method:
                        isEditMode
                            ? "PUT"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            inputData
                        )
                }
            );

        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response,
                    "管理ユーザーの保存に失敗しました。"
                );

            alert(
                message
            );

            return;
        }

        alert(
            "保存しました。"
        );

        window.location.href =
            "./admin_user_maintenance.html";

    } catch (error) {

        console.error(
            "保存エラー:",
            error
        );

        alert(
            error.message ||
            "管理ユーザーの保存中にエラーが発生しました。"
        );

    } finally {

        setButtonState(
            false
        );
    }

}


function getInputData() {

    return {
        user_name:
            userNameInput.value.trim(),

        email:
            emailInput.value
                .trim()
                .toLowerCase(),

        tenant_id:
            tenantIdSelect.value,

        start_date:
            startDateInput.value,

        end_date:
            endDateInput.value || null
    };

}


function validateInput(
    inputData
) {

    if (!inputData.user_name) {
        return "ユーザー名を入力してください。";
    }

    if (!inputData.email) {
        return "メールアドレスを入力してください。";
    }

    if (!emailInput.checkValidity()) {
        return "メールアドレスの形式が正しくありません。";
    }

    if (!inputData.tenant_id) {
        return "テナントを選択してください。";
    }

    if (!inputData.start_date) {
        return "利用開始日を入力してください。";
    }

    if (
        inputData.end_date &&
        inputData.start_date >
        inputData.end_date
    ) {
        return (
            "利用終了日は利用開始日以降の" +
            "日付を入力してください。"
        );
    }

    return "";
}


function handleBack() {

    window.location.href =
        "./admin_user_maintenance.html";

}


function formatDateValue(
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


async function getErrorMessage(
    response,
    defaultMessage
) {

    try {

        const result =
            await response.json();

        if (
            typeof result.detail ===
            "string"
        ) {
            return result.detail;
        }

        if (
            typeof result.message ===
            "string"
        ) {
            return result.message;
        }

    } catch (error) {

        console.error(
            "エラー応答解析失敗:",
            error
        );
    }

    return (
        `${defaultMessage} `
        + `HTTP ${response.status}`
    );
}
