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

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const generalUserList =
    document.getElementById("generalUserList");

const addUserButton =
    document.getElementById("addUserButton");

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

        if (
            !session.is_system_administrator &&
            !session.is_admin_user
        ) {

            alert("管理者権限がありません。");

            window.location.href = "./menu.html";

            return;
        }

        addUserButton.addEventListener(
            "click",
            handleAddUser
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadGeneralUsers();

    } catch (error) {

        console.error(
            "初期表示エラー:",
            error
        );

        alert(
            error.message ||
            "画面の初期化に失敗しました。"
        );

        window.location.href =
            "./menu.html";

    }

}

async function loadGeneralUsers() {

    showLoading();

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/general-users`,
                {
                    method: "GET"
                }
            );

        const users =
            Array.isArray(result)
                ? result
                : result.users || [];

        renderUsers(users);

    } catch (error) {

        console.error(
            "一般ユーザー一覧取得エラー:",
            error
        );

        showListMessage(
            error.message ||
            "一般ユーザー一覧を取得できませんでした。"
        );

    }

}

function renderUsers(users) {

    generalUserList.innerHTML = "";

    if (users.length === 0) {

        showListMessage(
            "一般ユーザーが登録されていません。"
        );

        return;

    }

    users.forEach(user => {

        const row =
            document.createElement("div");

        row.className = "list-row";

        row.appendChild(
            createColumn(
                user.user_name || "",
                "20%"
            )
        );

        row.appendChild(
            createColumn(
                user.email || "",
                "24%"
            )
        );

        row.appendChild(
            createColumn(
                user.parent_user || "",
                "18%"
            )
        );

        row.appendChild(
            createColumn(
                user.user_type || "",
                "10%"
            )
        );

        row.appendChild(
            createColumn(
                formatDate(user.start_date),
                "11%"
            )
        );

        row.appendChild(
            createColumn(
                formatDate(user.end_date),
                "11%"
            )
        );

        row.appendChild(
            createActionColumn(user)
        );

        generalUserList.appendChild(row);

    });

}

function createColumn(
    value,
    width
) {

    const column =
        document.createElement("div");

    column.style.width = width;
    column.textContent = value;

    return column;

}

function createActionColumn(
    user
) {

    const column =
        document.createElement("div");

    column.style.width = "6%";
    column.className =
        "list-row-actions";

    const editButton =
        document.createElement("button");

    editButton.type = "button";
    editButton.className = "btn";
    editButton.textContent = "編集";

    editButton.addEventListener(
        "click",
        () => handleEditUser(user)
    );

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "btn";
    deleteButton.textContent = "削除";

    deleteButton.addEventListener(
        "click",
        () => handleDeleteUser(user)
    );

    column.appendChild(editButton);
    column.appendChild(deleteButton);

    return column;

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

function showLoading() {

    showListMessage(
        "読み込み中..."
    );

}

function showListMessage(
    message
) {

    generalUserList.innerHTML = "";

    const row =
        document.createElement("div");

    row.className = "list-row";
    row.textContent = message;

    generalUserList.appendChild(row);

}

function handleAddUser() {

    window.location.href =
        "./general_user_edit.html";

}

function handleEditUser(
    user
) {

    const userId =
        user.id ||
        user.document_id;

    if (!userId) {

        alert(
            "ユーザーIDを取得できません。"
        );

        return;

    }

    window.location.href =
        `./general_user_edit.html?id=${encodeURIComponent(userId)}`;

}

async function handleDeleteUser(
    user
) {

    const userId =
        user.id ||
        user.document_id;

    if (!userId) {

        alert(
            "ユーザーIDを取得できません。"
        );

        return;

    }

    const confirmed =
        confirm(
            `${user.user_name}を削除しますか？`
        );

    if (!confirmed) {
        return;
    }

    try {

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/general-users/${encodeURIComponent(userId)}`,
            {
                method: "DELETE"
            }
        );

        await loadGeneralUsers();

    } catch (error) {

        console.error(
            "一般ユーザー削除エラー:",
            error
        );

        alert(
            error.message ||
            "一般ユーザーを削除できませんでした。"
        );

    }

}

function handleBack() {

    window.location.href =
        "./menu.html";

}
