import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==============================
// メッセージ表示
// ==============================

export function showError(message) {
  const errorBox = document.getElementById("errorBox");

  if (errorBox) {
    errorBox.style.display = "block";
    errorBox.textContent = message;
  } else {
    alert(message);
  }
}

export function clearError() {
  const errorBox = document.getElementById("errorBox");

  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }
}

export function showStatus(message) {
  const statusBox = document.getElementById("statusBox");

  if (statusBox) {
    statusBox.style.display = "block";
    statusBox.textContent = message;
  }
}

export function clearStatus() {
  const statusBox = document.getElementById("statusBox");

  if (statusBox) {
    statusBox.style.display = "none";
    statusBox.textContent = "";
  }
}

// ==============================
// 処理中表示
// ==============================

export function setBusy(isBusy, message = "") {
  const loginButton = document.getElementById("loginButton");

  if (loginButton) {
    loginButton.disabled = isBusy;
    loginButton.textContent = isBusy
      ? "ログイン処理中..."
      : "Googleでログイン";
  }

  if (isBusy) {
    showStatus(
      message || "処理中です。しばらくお待ちください。"
    );
  } else {
    clearStatus();
  }
}

// ==============================
// Firebase認証
// ==============================

export function waitForLogin() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();

        if (user) {
          resolve(user);
          return;
        }

        reject(new Error("ログインしていません。"));
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

// ==============================
// 認証付きAPI呼び出し
// ==============================

export async function authenticatedFetch(
  url,
  options = {}
) {
  const user = auth.currentUser || await waitForLogin();

  const idToken = await user.getIdToken();

  const headers = new Headers(options.headers || {});
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

  // IDトークン切れの場合は強制更新して1回だけ再実行
  if (response.status === 401) {
    const refreshedToken = await user.getIdToken(true);

    headers.set(
      "Authorization",
      `Bearer ${refreshedToken}`
    );

    response = await fetch(url, {
      ...options,
      headers
    });
  }

  return response;
}

// ==============================
// JSON取得
// ==============================

export async function fetchJsonOrThrow(
  url,
  options = {}
) {
  const response = await fetch(url, options);

  return parseJsonResponse(response);
}

export async function authenticatedJsonOrThrow(
  url,
  options = {}
) {
  const response = await authenticatedFetch(
    url,
    options
  );

  return parseJsonResponse(response);
}

async function parseJsonResponse(response) {
  let data = null;
  let text = "";

  try {
    data = await response.json();
  } catch {
    try {
      text = await response.text();
    } catch {
      text = "";
    }
  }

  if (!response.ok) {
    throw new Error(
      (data &&
        (
          data.detail ||
          data.message ||
          data.error
        )) ||
      text ||
      `HTTP ${response.status}`
    );
  }

  return data;
}
