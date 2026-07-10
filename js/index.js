import { auth, provider } from "./firebase-config.js";
import { API_BASE_URL } from "./config.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  clearError,
  showError,
  setBusy,
  fetchJsonOrThrow
} from "./common.js";

// ログインボタン押下
document.getElementById("loginButton").addEventListener("click", async (e) => {
  e.preventDefault();

  clearError();
  setBusy(true, "Googleログインを開始しています...");

  try {
    // Googleログイン
    setBusy(true, "Googleアカウントで認証しています...");
    const result = await signInWithPopup(auth, provider);

    // IDトークン取得
    setBusy(true, "認証情報を取得しています...");
    const idToken = await result.user.getIdToken(true);

    // セッション開始
    setBusy(true, "セッションを開始しています...");
    const session = await fetchJsonOrThrow(
        `${API_BASE_URL}/session`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${idToken}`
            }
        }
    );

    // 管理者判定（確認用）
    alert(
        session.is_system_administrator
            ? "System Administratorです"
            : "一般ユーザーです"
    );

    // 管理者判定
    if (session.is_system_administrator) {
        window.location.href = "./admin_user_maintenance.html";
        return;
    }

    // ユーザー初期化
    //setBusy(true, "ユーザー環境を初期化しています...");
    //await fetchJsonOrThrow(
    //    `${API_BASE_URL}/v1/user/init`,
    //    {
    //        method: "POST",
    //        headers: {
    //            Authorization: `Bearer ${idToken}`
    //        }
    //    }
    //);

    // メニューへ
    setBusy(true, "メニューへ移動しています...");
    window.location.href = "./menu.html";

  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
    setBusy(false);
  }
});
