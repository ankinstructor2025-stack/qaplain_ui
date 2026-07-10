import {
  auth,
  provider
} from "./firebase-config.js";

import {
  API_BASE_URL
} from "./config.js";

import {
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  clearError,
  showError,
  setBusy,
  fetchJsonOrThrow
} from "./common.js";

const loginButton =
  document.getElementById("loginButton");

loginButton.addEventListener("click", async (event) => {
  event.preventDefault();

  clearError();
  setBusy(true, "Googleログインを開始しています...");

  try {
    setBusy(
      true,
      "Googleアカウントで認証しています..."
    );

    const result = await signInWithPopup(
      auth,
      provider
    );

    setBusy(
      true,
      "認証情報を取得しています..."
    );

    const idToken =
      await result.user.getIdToken(true);

    setBusy(
      true,
      "セッションを開始しています..."
    );

    const session = await fetchJsonOrThrow(
      `${API_BASE_URL}/session`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      }
    );

    if (session.is_system_administrator) {
      window.location.href =
        "./admin_user_maintenance.html";
      return;
    }

    setBusy(
      true,
      "メニューへ移動しています..."
    );

    window.location.href = "./menu.html";

  } catch (error) {
    console.error("ログインエラー:", error);

    showError(
      error.message || String(error)
    );

    setBusy(false);
  }
});
