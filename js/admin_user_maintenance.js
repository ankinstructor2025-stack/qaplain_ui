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

const adminUserList =
  document.getElementById("adminUserList");

const addUserButton =
  document.getElementById("addUserButton");

const logoutButton =
  document.getElementById("logoutButton");

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

    if (!session.is_system_administrator) {
      alert(
        "SYSTEM_ADMINISTRATOR権限がありません。"
      );

      window.location.href = "./menu.html";
      return;
    }

    addUserButton.addEventListener(
      "click",
      handleAddUser
    );

    logoutButton.addEventListener(
      "click",
      handleLogout
    );

    await loadAdminUsers();

  } catch (error) {
    console.error("初期表示エラー:", error);

    alert(
      error.message ||
      "画面の初期化に失敗しました。"
    );

    window.location.href = "./index.html";
  }
}

async function loadAdminUsers() {
  showLoading();

  try {
    const result =
      await authenticatedJsonOrThrow(
        `${API_BASE_URL}/admin-users`,
        {
          method: "GET"
        }
      );

    const users = Array.isArray(result)
      ? result
      : result.users || [];

    renderUsers(users);

  } catch (error) {
    console.error(
      "管理ユーザー一覧取得エラー:",
      error
    );

    showListMessage(
      error.message ||
      "管理ユーザー一覧を取得できませんでした。"
    );
  }
}

function renderUsers(users) {
  adminUserList.innerHTML = "";

  if (users.length === 0) {
    showListMessage(
      "管理ユーザーが登録されていません。"
    );
    return;
  }

  users.forEach((user) => {
    const row =
      document.createElement("div");

    row.className = "list-row";

    row.appendChild(
      createColumn(
        user.user_name || "",
        "18%"
      )
    );

    row.appendChild(
      createColumn(
        user.email || "",
        "26%"
      )
    );

    row.appendChild(
      createColumn(
        user.tenant_name ||
        user.tenant_id ||
        "",
        "18%"
      )
    );

    row.appendChild(
      createColumn(
        formatDate(
          user.start_date
        ),
        "14%"
      )
    );

    row.appendChild(
      createColumn(
        formatDate(
          user.end_date
        ),
        "14%"
      )
    );

    row.appendChild(
      createActionColumn(
        user
      )
    );

    adminUserList.appendChild(
      row
    );
  });
}

function createColumn(value, width) {
  const column = document.createElement("div");

  column.style.width = width;
  column.textContent = value;

  return column;
}

function createActionColumn(user) {
  const column = document.createElement("div");

  column.style.width = "10%";
  column.className = "list-row-actions";

  const editButton =
    document.createElement("button");

  editButton.type = "button";
  editButton.className = "btn";
  editButton.textContent = "編集";

  editButton.addEventListener("click", () => {
    handleEditUser(user);
  });

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className = "btn";
  deleteButton.textContent = "削除";

  deleteButton.addEventListener("click", () => {
    handleDeleteUser(user);
  });

  column.appendChild(editButton);
  column.appendChild(deleteButton);

  return column;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 10);
}

function showLoading() {
  showListMessage("読み込み中...");
}

function showListMessage(message) {
  adminUserList.innerHTML = "";

  const row = document.createElement("div");
  row.className = "list-row";
  row.textContent = message;

  adminUserList.appendChild(row);
}

function handleAddUser() {
  window.location.href =
    "./admin_user_edit.html";
}

function handleEditUser(user) {
  const userId =
    user.id || user.document_id;

  if (!userId) {
    alert("ユーザーIDを取得できません。");
    return;
  }

  window.location.href =
    `./admin_user_edit.html?id=${
      encodeURIComponent(userId)
    }`;
}

async function handleDeleteUser(user) {
  const userId =
    user.id || user.document_id;

  if (!userId) {
    alert("ユーザーIDを取得できません。");
    return;
  }

  const displayName =
    user.user_name ||
    user.email ||
    "この管理ユーザー";

  const confirmed = window.confirm(
    `${displayName}を削除しますか？`
  );

  if (!confirmed) {
    return;
  }

  try {
    await authenticatedJsonOrThrow(
      `${API_BASE_URL}/admin-users/${
        encodeURIComponent(userId)
      }`,
      {
        method: "DELETE"
      }
    );

    await loadAdminUsers();

  } catch (error) {
    console.error(
      "管理ユーザー削除エラー:",
      error
    );

    alert(
      error.message ||
      "管理ユーザーを削除できませんでした。"
    );
  }
}

async function handleLogout() {
  try {
    await signOut(auth);

    window.location.href = "./index.html";

  } catch (error) {
    console.error(
      "ログアウトエラー:",
      error
    );

    alert("ログアウトに失敗しました。");
  }
}
