/**
 * data_import_file_upload.js
 *
 * ファイルアップロード処理
 * POST /data-import/file-upload
 *
 * ファイルアップロードではデータソースを使用しない。
 */

console.log("data_import_file_upload.js loaded");

(function () {
  "use strict";

  function getFileInput() {
    return document.getElementById("uploadFileInput");
  }

  function getFileNameView() {
    return document.getElementById("uploadFileName");
  }

  function getSelectedFile() {
    const input = getFileInput();

    if (!input || !input.files || input.files.length === 0) {
      return null;
    }

    return input.files[0];
  }

  function syncSelectedFileName() {
    const view = getFileNameView();
    const file = getSelectedFile();

    if (!view) {
      return;
    }

    if (file) {
      view.textContent = file.name;
      view.classList.remove("is-empty");
      return;
    }

    view.textContent = "ファイルが選択されていません";
    view.classList.add("is-empty");
  }

  function bindFileInput() {
    const input = getFileInput();

    if (!input) {
      return;
    }

    input.addEventListener("change", syncSelectedFileName);
    syncSelectedFileName();
  }

  async function run({
    apiBase,
    idToken,
    writeLog
  }) {
    validateArguments({
      apiBase,
      idToken
    });

    const file = getSelectedFile();

    if (!file) {
      throw new Error(
        "アップロードするファイルを選択してください。"
      );
    }

    writeLog?.(`ファイル取込開始: ${file.name}`);

    let response = await uploadFile({
      apiBase,
      idToken,
      file,
      overwrite: false
    });

    if (response.status === 409) {
      const conflictData = await readResponseBody(response);
      const message = getConflictMessage(conflictData);

      const confirmed = window.confirm(
        `${message}\n\n上書きしますか？`
      );

      if (!confirmed) {
        writeLog?.("ファイル取込をキャンセルしました。");

        return {
          status: "cancelled"
        };
      }

      writeLog?.("同名ファイルを上書きします。");

      response = await uploadFile({
        apiBase,
        idToken,
        file,
        overwrite: true
      });
    }

    const result = await readResponse(response);

    writeLog?.(
      result.status === "updated"
        ? "ファイル上書き完了"
        : "ファイル取込完了"
    );

    writeResultLog(
      result,
      writeLog
    );

    return result;
  }

  async function uploadFile({
    apiBase,
    idToken,
    file,
    overwrite
  }) {
    const formData = new FormData();

    formData.append(
      "overwrite",
      String(Boolean(overwrite))
    );

    formData.append(
      "file",
      file
    );

    return await fetch(
      `${apiBase}/data-import/file-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: formData
      }
    );
  }

  function validateArguments({
    apiBase,
    idToken
  }) {
    if (!apiBase) {
      throw new Error(
        "apiBaseが指定されていません。"
      );
    }

    if (!idToken) {
      throw new Error(
        "idTokenがありません。"
      );
    }
  }

  async function readResponse(response) {
    const data = await readResponseBody(response);

    if (!response.ok) {
      throw new Error(
        getErrorDetail(
          response,
          data
        )
      );
    }

    return data;
  }

  async function readResponseBody(response) {
    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return {
      message: await response.text()
    };
  }

  function getConflictMessage(data) {
    const detail = data?.detail;

    if (typeof detail === "object" && detail) {
      return (
        detail.message ||
        "同名ファイルが既に登録されています。"
      );
    }

    if (typeof detail === "string") {
      return detail;
    }

    return (
      data?.message ||
      "同名ファイルが既に登録されています。"
    );
  }

  function getErrorDetail(response, data) {
    const detail = data?.detail;

    if (typeof detail === "object" && detail) {
      return (
        detail.message ||
        JSON.stringify(detail)
      );
    }

    if (typeof detail === "string") {
      return detail;
    }

    return (
      data?.message ||
      `ファイル取込に失敗しました。HTTP ${response.status}`
    );
  }

  function writeResultLog(result, writeLog) {
    if (!writeLog || !result) {
      return;
    }

    if (result.message) {
      writeLog(result.message);
    }

    if (result.file_id) {
      writeLog(`file_id=${result.file_id}`);
    }

    if (result.file_name) {
      writeLog(`file_name=${result.file_name}`);
    }

    if (result.gcs_path) {
      writeLog(`gcs_path=${result.gcs_path}`);
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    bindFileInput
  );

  window.DataImportFileUpload = {
    run,
    getSelectedFile,
    syncSelectedFileName
  };
})();
