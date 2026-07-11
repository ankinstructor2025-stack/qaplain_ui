import { API_BASE_URL } from "./config.js";
import {
    authenticatedFetch,
    waitForLogin
} from "./common.js";

const saveButton = document.getElementById("saveButton");
const backButton = document.getElementById("backButton");

const userNameInput = document.getElementById("userName");
const emailInput = document.getElementById("email");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const urlParameters = new URLSearchParams(location.search);
const adminUserId = urlParameters.get("id");

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {

    try {

        await waitForLogin();

        const isSystemAdministrator =
            await checkSystemAdministrator();

        if (!isSystemAdministrator) {

            alert("SYSTEM_ADMINISTRATOR権限がありません。");
            location.href = "./menu.html";
            return;

        }

        saveButton.addEventListener("click", handleSave);
        backButton.addEventListener("click", handleBack);

        if (adminUserId) {
            await loadAdminUser();
        }

    } catch (error) {

        console.error("初期表示エラー", error);

        alert("初期化に失敗しました。");

        location.href = "./index.html";

    }

}

async function checkSystemAdministrator() {

    const response = await authenticatedFetch(
        `${API_BASE_URL}/system-admin`,
        {
            method: "GET"
        }
    );

    if (!response.ok) {

        throw new Error(
            `SYSTEM_ADMINISTRATOR確認失敗:${response.status}`
        );

    }

    const result = await response.json();

    return result.is_system_administrator === true;

}

async function loadAdminUser() {

    setSavingState(true, "読み込み中...");

    try {

        const response = await authenticatedFetch(
            `${API_BASE_URL}/admin-users/${encodeURIComponent(adminUserId)}`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {

            const message = await getErrorMessage(
                response,
                "管理ユーザーの取得に失敗しました。"
            );

            throw new Error(message);

        }

        const user = await response.json();

        userNameInput.value = user.user_name ?? "";
        emailInput.value = user.email ?? "";
        startDateInput.value = formatDateValue(user.start_date);
        endDateInput.value = formatDateValue(user.end_date);

    } finally {

        setSavingState(false);

    }

}

async function handleSave() {

    const inputData = getInputData();

    const validationMessage = validateInput(inputData);

    if (validationMessage) {

        alert(validationMessage);
        return;

    }

    setSavingState(true, "保存中...");

    try {

        const isEditMode = Boolean(adminUserId);

        const url = isEditMode
            ? `${API_BASE_URL}/admin-users/${encodeURIComponent(adminUserId)}`
            : `${API_BASE_URL}/admin-users`;

        const method = isEditMode ? "PUT" : "POST";

        const response = await authenticatedFetch(
            url,
            {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(inputData)
            }
        );

        if (!response.ok) {

            const message = await getErrorMessage(
                response,
                "管理ユーザーの保存に失敗しました。"
            );

            alert(message);
            return;

        }

        alert("保存しました。");

        location.href = "./admin_user_maintenance.html";

    } catch (error) {

        console.error("保存エラー", error);

        alert("管理ユーザーの保存中にエラーが発生しました。");

    } finally {

        setSavingState(false);

    }

}

function getInputData() {

    return {
        user_name: userNameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        start_date: startDateInput.value || null,
        end_date: endDateInput.value || null
    };

}

function validateInput(inputData) {

    if (!inputData.user_name) {
        return "ユーザー名を入力してください。";
    }

    if (!inputData.email) {
        return "メールアドレスを入力してください。";
    }

    if (!emailInput.checkValidity()) {
        return "メールアドレスの形式が正しくありません。";
    }

    if (!inputData.start_date) {
        return "利用開始日を入力してください。";
    }

    if (
        inputData.end_date &&
        inputData.start_date > inputData.end_date
    ) {
        return "利用終了日は利用開始日以降の日付を入力してください。";
    }

    return "";

}

function handleBack() {

    location.href = "./admin_user_maintenance.html";

}

function formatDateValue(value) {

    if (!value) {
        return "";
    }

    return String(value).substring(0, 10);

}

function setSavingState(isSaving, message = "保存中...") {

    saveButton.disabled = isSaving;
    backButton.disabled = isSaving;

    saveButton.textContent = isSaving
        ? message
        : "保存";

}

async function getErrorMessage(response, defaultMessage) {

    try {

        const result = await response.json();

        if (typeof result.detail === "string") {
            return result.detail;
        }

        if (typeof result.message === "string") {
            return result.message;
        }

    } catch (error) {

        console.error("エラー応答解析失敗", error);

    }

    return `${defaultMessage} HTTP ${response.status}`;

}
