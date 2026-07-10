import { auth } from "./firebase-config.js";
import { API_BASE_URL } from "./config.js";
import { authenticatedFetch, waitForLogin } from "./common.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const adminUserList = document.getElementById("adminUserList");
const addUserButton = document.getElementById("addUserButton");
const logoutButton = document.getElementById("logoutButton");

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {

    try {

        await waitForLogin();

        const isAdmin = await checkSystemAdministrator();

        if (!isAdmin) {
            alert("SYSTEM_ADMINISTRATOR権限がありません。");
            location.href = "./menu.html";
            return;
        }

        addUserButton.addEventListener("click", handleAddUser);
        logoutButton.addEventListener("click", handleLogout);

        await loadAdminUsers();

    } catch (e) {

        console.error("初期表示エラー", e);

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

async function loadAdminUsers() {

    showLoading();

    const response = await authenticatedFetch(
        `${API_BASE_URL}/admin-users`,
        {
            method: "GET"
        }
    );

    if (!response.ok) {
        throw new Error(
            `管理ユーザー取得失敗:${response.status}`
        );
    }

    const result = await response.json();

    const users = Array.isArray(result)
        ? result
        : result.users ?? [];

    renderUsers(users);

}

function renderUsers(users) {

    adminUserList.innerHTML = "";

    if (users.length === 0) {

        adminUserList.innerHTML =
            `<div class="list-row">管理ユーザーが登録されていません。</div>`;

        return;
    }

    users.forEach(user => {

        const row = document.createElement("div");
        row.className = "list-row";

        row.innerHTML = `
            <div style="width:22%;">${user.user_name ?? ""}</div>
            <div style="width:32%;">${user.email ?? ""}</div>
            <div style="width:16%;">${formatDate(user.start_date)}</div>
            <div style="width:16%;">${formatDate(user.end_date)}</div>
            <div style="width:14%;" class="list-row-actions">
                <button class="btn edit-btn">編集</button>
                <button class="btn delete-btn">削除</button>
            </div>
        `;

        row.querySelector(".edit-btn")
            .addEventListener("click", () => editUser(user));

        row.querySelector(".delete-btn")
            .addEventListener("click", () => deleteUser(user));

        adminUserList.appendChild(row);

    });

}

function formatDate(value) {

    if (!value) {
        return "";
    }

    return String(value).substring(0, 10);

}

function showLoading() {

    adminUserList.innerHTML =
        `<div class="list-row">読み込み中...</div>`;

}

function handleAddUser() {

    location.href = "./admin_user_edit.html";

}

function editUser(user) {

    const id = user.id ?? user.document_id;

    location.href =
        `./admin_user_edit.html?id=${encodeURIComponent(id)}`;

}

async function deleteUser(user) {

    const id = user.id ?? user.document_id;

    if (!confirm("削除しますか？")) {
        return;
    }

    const response = await authenticatedFetch(
        `${API_BASE_URL}/admin-users/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );

    if (!response.ok) {

        alert("削除に失敗しました。");
        return;

    }

    await loadAdminUsers();

}

async function handleLogout() {

    await signOut(auth);

    location.href = "./index.html";

}
