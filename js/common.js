// ==============================
// 共通関数
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

export function setBusy(isBusy, message = "") {
  const loginButton = document.getElementById("loginButton");

  if (loginButton) {
    loginButton.disabled = isBusy;
    loginButton.textContent = isBusy
      ? "ログイン処理中..."
      : "Googleでログイン";
  }

  if (isBusy) {
    showStatus(message || "処理中です。しばらくお待ちください。");
  } else {
    clearStatus();
  }
}

export async function fetchJsonOrThrow(url, options = {}) {
  const response = await fetch(url, options);

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
      (data && (data.detail || data.message || data.error)) ||
      text ||
      `HTTP ${response.status}`
    );
  }

  return data;
}
