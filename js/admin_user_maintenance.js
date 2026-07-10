import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const API_BASE_URL = "YOUR_CLOUD_RUN_URL";

const adminUserList = document.getElementById("adminUserList");
const addUserButton = document.getElementById("addUserButton");
const logoutButton = document.getElementById("logoutButton");

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    initializePage();
});

function initializePage() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "./index.html";
            return;
        }

        currentUser = user;

        try {
            const isSystemAdministrator =
                await checkSystemAdministrator();

            if (!isSystemAdministrator) {
                alert("SYSTEM_ADMINISTRATOR権限がありません。");
                window.location.href = "./menu.html";
                return;
            }

            await loadAdminUsers();

        } catch (error) {
            console.error("初期表示エラー:", error);
            alert("画面の初期化に失敗しました。");
        }
    });

    addUserButton.addEventListener("click", handleAddUser);
    logoutButton.addEventListener("click", handleLogout);
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
            `SYSTEM_ADMINISTRATOR確認失敗: ${response.status}`
        );
    }

    const result = await response.json();

    return result.is_system_administrator === true;
}

async function loadAdminUsers() {
    showLoading();

    try {
        const response = await authenticatedFetch(
            `${API_BASE_URL}/admin-users`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {
            throw new Error(
                `管理ユーザー一覧取得失敗: ${response.status}`
            );
        }

        const result = await response.json();

        const users = Array.isArray(result)
            ? result
            : result.users ?? [];

        renderAdminUsers(users);

    } catch (error) {
        console.error("管理ユーザー一覧取得エラー:", error);
        showError("管理ユーザー一覧を取得できませんでした。");
    }
}

function renderAdminUsers(users) {
    adminUserList.innerHTML = "";

    if (users.length === 0) {
        const emptyRow = document.createElement("div");
        emptyRow.className = "list-row";
        emptyRow.textContent = "登録されている管理ユーザーはありません。";

        adminUserList.appendChild(emptyRow);
        return;
    }

    users.forEach((user) => {
        adminUserList.appendChild(createUserRow(user));
    });
}

function createUserRow(user) {
    const row = document.createElement("div");
    row.className = "list-row";

    const userName = createColumn(
        user.user_name ?? "",
        "22%"
    );

    const email = createColumn(
        user.email ?? "",
        "32%"
    );

    const startDate = createColumn(
        formatDate(user.start_date),
        "16%"
    );

    const endDate = createColumn(
        formatDate(user.end_date),
        "16%"
    );

    const actionColumn = document.createElement("div");
    actionColumn.style.width = "14%";
    actionColumn.className = "list-row-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => {
        handleEditUser(user);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => {
        handleDeleteUser(user);
    });

    actionColumn.appendChild(editButton);
    actionColumn.appendChild(deleteButton);

    row.appendChild(userName);
    row.appendChild(email);
    row.appendChild(startDate);
    row.appendChild(endDate);
    row.appendChild(actionColumn);

    return row;
}

function createColumn(value, width) {
    const column = document.createElement("div");
    column.style.width = width;
    column.textContent = value;

    return column;
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    return String(value).substring(0, 10);
}

function handleAddUser() {
    window.location.href = "./admin_user_edit.html";
}

function handleEditUser(user) {
    const userId = user.id ?? user.document_id;

    if (!userId) {
        alert("ユーザーIDを取得できません。");
        return;
    }

    const encodedUserId = encodeURIComponent(userId);

    window.location.href =
        `./admin_user_edit.html?id=${encodedUserId}`;
}

async function handleDeleteUser(user) {
    const userId = user.id ?? user.document_id;

    if (!userId) {
        alert("ユーザーIDを取得できません。");
        return;
    }

    const userName = user.user_name || user.email || "このユーザー";

    const confirmed = window.confirm(
        `${userName}を削除しますか？`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await authenticatedFetch(
            `${API_BASE_URL}/admin-users/${encodeURIComponent(userId)}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error(
                `管理ユーザー削除失敗: ${response.status}`
            );
        }

        await loadAdminUsers();

    } catch (error) {
        console.error("管理ユーザー削除エラー:", error);
        alert("管理ユーザーを削除できませんでした。");
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = "./index.html";

    } catch (error) {
        console.error("ログアウトエラー:", error);
        alert("ログアウトに失敗しました。");
    }
}

async function authenticatedFetch(url, options = {}) {
    if (!currentUser) {
        throw new Error("ログインユーザーが存在しません。");
    }

    const idToken = await currentUser.getIdToken();

    const headers = new Headers(options.headers ?? {});
    headers.set("Authorization", `Bearer ${idToken}`);

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has("Content-Type")
    ) {
        headers.set("Content-Type", "application/json");
    }

    let response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status !== 401) {
        return response;
    }

    const refreshedToken = await currentUser.getIdToken(true);
    headers.set("Authorization", `Bearer ${refreshedToken}`);

    response = await fetch(url, {
        ...options,
        headers
    });

    return response;
}

function showLoading() {
    adminUserList.innerHTML = "";

    const loadingRow = document.createElement("div");
    loadingRow.className = "list-row";
    loadingRow.textContent = "読み込み中...";

    adminUserList.appendChild(loadingRow);
}

function showError(message) {
    adminUserList.innerHTML = "";

    const errorRow = document.createElement("div");
    errorRow.className = "list-row";
    errorRow.textContent = message;

    adminUserList.appendChild(errorRow);
}
