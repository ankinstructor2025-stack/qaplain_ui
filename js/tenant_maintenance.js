import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

const tenantList =
    document.getElementById("tenantList");

const addTenantButton =
    document.getElementById("addTenantButton");

const backButton =
    document.getElementById("backButton");

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

        addTenantButton.addEventListener(
            "click",
            handleAddTenant
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadTenants();

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

async function loadTenants() {

    showLoading();

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/tenants`,
                {
                    method: "GET"
                }
            );

        const tenants =
            Array.isArray(result)
                ? result
                : result.tenants || [];

        renderTenants(tenants);

    } catch (error) {

        console.error(
            "テナント一覧取得エラー:",
            error
        );

        showListMessage(
            error.message ||
            "テナント一覧を取得できませんでした。"
        );

    }

}

function renderTenants(tenants) {

    tenantList.innerHTML = "";

    if (tenants.length === 0) {

        showListMessage(
            "テナントが登録されていません。"
        );

        return;

    }

    tenants.forEach(tenant => {

        const row =
            document.createElement("div");

        row.className =
            "list-row";

        row.appendChild(
            createColumn(
                tenant.tenant_name || "",
                "28%"
            )
        );

        row.appendChild(
            createColumn(
                tenant.parent_user || "",
                "30%"
            )
        );

        row.appendChild(
            createColumn(
                formatDate(tenant.start_date),
                "14%"
            )
        );

        row.appendChild(
            createColumn(
                formatDate(tenant.end_date),
                "14%"
            )
        );

        row.appendChild(
            createActionColumn(tenant)
        );

        tenantList.appendChild(row);

    });

}

function createColumn(
    value,
    width
) {

    const column =
        document.createElement("div");

    column.style.width =
        width;

    column.textContent =
        value;

    return column;

}

function createActionColumn(
    tenant
) {

    const column =
        document.createElement("div");

    column.style.width =
        "14%";

    column.className =
        "list-row-actions";

    const editButton =
        document.createElement("button");

    editButton.type =
        "button";

    editButton.className =
        "btn";

    editButton.textContent =
        "編集";

    editButton.addEventListener(
        "click",
        () => handleEditTenant(tenant)
    );

    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "btn";

    deleteButton.textContent =
        "削除";

    deleteButton.addEventListener(
        "click",
        () => handleDeleteTenant(tenant)
    );

    column.appendChild(
        editButton
    );

    column.appendChild(
        deleteButton
    );

    return column;

}

function handleAddTenant() {

    location.href =
        "./tenant_edit.html";

}

function handleEditTenant(
    tenant
) {

    const tenantId =
        tenant.id ||
        tenant.document_id;

    if (!tenantId) {

        alert(
            "テナントIDを取得できません。"
        );

        return;

    }

    location.href =
        `./tenant_edit.html?id=${
            encodeURIComponent(tenantId)
        }`;

}

async function handleDeleteTenant(
    tenant
) {

    const tenantId =
        tenant.id ||
        tenant.document_id;

    if (!tenantId) {

        alert(
            "テナントIDを取得できません。"
        );

        return;

    }

    const displayName =
        tenant.tenant_name ||
        "このテナント";

    const confirmed =
        confirm(
            `${displayName}を削除しますか？`
        );

    if (!confirmed) {
        return;
    }

    try {

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/tenants/${
                encodeURIComponent(tenantId)
            }`,
            {
                method: "DELETE"
            }
        );

        await loadTenants();

    } catch (error) {

        console.error(
            "テナント削除エラー:",
            error
        );

        alert(
            error.message ||
            "テナントを削除できませんでした。"
        );

    }

}

function showLoading() {

    showListMessage(
        "読み込み中..."
    );

}

function showListMessage(
    message
) {

    tenantList.innerHTML = "";

    const row =
        document.createElement("div");

    row.className =
        "list-row";

    row.textContent =
        message;

    tenantList.appendChild(row);

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
        "./menu.html";

}
