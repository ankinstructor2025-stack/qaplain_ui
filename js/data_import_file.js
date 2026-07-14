/**
 * data_import_file.js
 *
 * ファイル型データソースの取込処理
 *
 * API:
 * POST /data-import/file
 *
 * FormData:
 * - data_source_id
 * - file
 */

console.log("data_import_file.js loaded");

(function () {
  "use strict";

  function getFileInput() {
    return document.getElementById(
      "uploadFileInput"
    );
  }

  function getFileNameView() {
    return document.getElementById(
      "uploadFileName"
    );
  }

  function getSelectedFile() {
    const input = getFileInput();

    if (
      !input ||
      !input.files ||
      input.files.length === 0
    ) {
      return null;
    }

    return input.files[0];
  }

  function syncSelectedFileName() {
    const input = getFileInput();
    const view = getFileNameView();

    if (!input || !view) {
      return;
    }

    const file = getSelectedFile();

    if (file) {
      view.textContent = file.name;
      view.classList.remove(
        "is-empty"
      );
      return;
    }

    view.textContent =
      "ファイルが選択されていません";

    view.classList.add(
      "is-empty"
    );
  }

  function bindFileInput() {
    const input = getFileInput();

    if (!input) {
      return;
    }

    input.addEventListener(
      "change",
      syncSelectedFileName
    );

    syncSelectedFileName();
  }

  async function run({
    apiBase,
    idToken,
    dataSource,
    writeLog
  }) {
    validateArguments({
      apiBase,
      idToken,
      dataSource
    });

    const file = getSelectedFile();

    if (!file) {
      throw new Error(
        "アップロードするファイルを選択してください。"
      );
    }

    writeLog?.(
      `ファイル取込開始: ${file.name}`
    );

    const formData = new FormData();

    formData.append(
      "data_source_id",
      dataSource.data_source_id
    );

    formData.append(
      "file",
      file
    );

    const response = await fetch(
      `${apiBase}/data-import/file`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${idToken}`
        },
        body: formData
      }
    );

    const result =
      await readResponse(
        response
      );

    writeLog?.(
      "ファイル取込完了"
    );

    writeResultLog(
      result,
      writeLog
    );

    return result;
  }

  function validateArguments({
    apiBase,
    idToken,
    dataSource
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

    if (
      !dataSource ||
      !dataSource.data_source_id
    ) {
      throw new Error(
        "データソースが選択されていません。"
      );
    }

    if (
      String(
        dataSource.source_type || ""
      ).toLowerCase() !== "file"
    ) {
      throw new Error(
        "ファイル型のデータソースではありません。"
      );
    }
  }

  async function readResponse(
    response
  ) {
    const data =
      await readResponseBody(
        response
      );

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

  async function readResponseBody(
    response
  ) {
    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      return await response.json();
    }

    const text =
      await response.text();

    return {
      message: text
    };
  }

  function getErrorDetail(
    response,
    data
  ) {
    if (response.status === 409) {
      return (
        data?.detail ||
        "同名ファイルは登録済みです。"
      );
    }

    return (
      data?.detail ||
      data?.message ||
      `ファイル取込に失敗しました。HTTP ${response.status}`
    );
  }

  function writeResultLog(
    result,
    writeLog
  ) {
    if (!writeLog || !result) {
      return;
    }

    if (result.message) {
      writeLog(
        result.message
      );
    }

    if (result.file_id) {
      writeLog(
        `file_id=${result.file_id}`
      );
    }

    if (result.file_name) {
      writeLog(
        `file_name=${result.file_name}`
      );
    }

    if (result.gcs_path) {
      writeLog(
        `gcs_path=${result.gcs_path}`
      );
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    bindFileInput
  );

  window.DataImportFile = {
    run,
    getSelectedFile,
    syncSelectedFileName
  };
})();
