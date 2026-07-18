import { API_BASE_URL } from "./config.js";
import { waitForLogin, authenticatedJsonOrThrow } from "./common.js";

const saveButton = document.getElementById("saveButton");
const backButton = document.getElementById("backButton");
const userNameInput = document.getElementById("userName");
const tenantIdSelect = document.getElementById("tenantId");
const parentUserInput = document.getElementById("parentUser");
const emailInput = document.getElementById("email");
const userTypeInput = document.getElementById("userType");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const generalUserId = new URLSearchParams(location.search).get("id");

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    try {
        await waitForLogin();
        saveButton.addEventListener("click", handleSave);
        backButton.addEventListener("click", handleBack);
        await loadAvailableTenants();
        if (generalUserId) {
            await loadGeneralUser();
        }
    } catch (error) {
        console.error("一般ユーザー編集画面初期化エラー:", error);
        alert(error.message || "初期化に失敗しました。");
    }
}

async function loadAvailableTenants() {
    const result = await authenticatedJsonOrThrow(
        `${API_BASE_URL}/general-users/available-tenants`,
        { method: "GET" }
    );
    const tenants = Array.isArray(result) ? result : result.tenants || [];
    tenantIdSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "テナントを選択してください";
    tenantIdSelect.appendChild(placeholder);
    tenants.forEach(tenant => {
        const option = document.createElement("option");
        option.value = tenant.tenant_id || "";
        option.textContent = tenant.tenant_name || tenant.tenant_id || "";
        tenantIdSelect.appendChild(option);
    });
    if (tenants.length === 1) {
        tenantIdSelect.value = tenants[0].tenant_id;
        tenantIdSelect.disabled = true;
    }
}

async function loadGeneralUser() {
    const user = await authenticatedJsonOrThrow(
        `${API_BASE_URL}/general-users/${encodeURIComponent(generalUserId)}`,
        { method: "GET" }
    );
    userNameInput.value = user.user_name || "";
    emailInput.value = user.email || "";
    tenantIdSelect.value = user.tenant_id || "";
    parentUserInput.value = user.parent_user || "";
    userTypeInput.value = user.user_type || "GENERAL";
    startDateInput.value = formatDate(user.start_date);
    endDateInput.value = formatDate(user.end_date);
}

function validateInput() {
    if (!userNameInput.value.trim()) return "ユーザー名を入力してください。";
    if (!emailInput.value.trim()) return "メールアドレスを入力してください。";
    if (!tenantIdSelect.value) return "テナントを選択してください。";
    if (!startDateInput.value) return "利用開始日を入力してください。";
    return "";
}

async function handleSave() {
    const validationMessage = validateInput();
    if (validationMessage) {
        alert(validationMessage);
        return;
    }
    const body = {
        user_name: userNameInput.value.trim(),
        email: emailInput.value.trim(),
        tenant_id: tenantIdSelect.value,
        user_type: userTypeInput.value,
        start_date: startDateInput.value,
        end_date: endDateInput.value || null
    };
    const url = generalUserId
        ? `${API_BASE_URL}/general-users/${encodeURIComponent(generalUserId)}`
        : `${API_BASE_URL}/general-users`;
    const method = generalUserId ? "PUT" : "POST";
    try {
        await authenticatedJsonOrThrow(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        alert("保存しました。");
        location.href = "./general_user_maintenance.html";
    } catch (error) {
        console.error("一般ユーザー保存エラー:", error);
        alert(error.message || "保存に失敗しました。");
    }
}

function handleBack() {
    location.href = "./general_user_maintenance.html";
}

function formatDate(value) {
    return value ? String(value).substring(0, 10) : "";
}
