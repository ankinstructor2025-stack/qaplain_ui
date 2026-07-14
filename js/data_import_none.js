/**
 * data_import_none.js
 *
 * 認証なしのURL/APIデータソース取込処理
 *
 * API:
 * POST /data-import/none
 *
 * JSON:
 * {
 *   "data_source_id": "..."
 * }
 */

console.log("data_import_none.js loaded");

(function () {
  "use strict";

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

    writeLog?.(
      `データ取込開始: ${dataSource.data_source_name}`
    );

    const response = await fetch(
      `${apiBase}/data-import/none`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${idToken}`
        },
        body: JSON.stringify({
          data_source_id:
            dataSource.data_source_id
        })
      }
    );

    const result =
      await readResponse(
        response
      );

    writeLog?.(
      "データ取込完了"
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

    const sourceType =
      String(
        dataSource.source_type || ""
      ).toLowerCase();

    if (
      sourceType !== "url" &&
      sourceType !== "api"
    ) {
      throw new Error(
        "URLまたはAPI型のデータソースではありません。"
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
        data?.detail ||
        data?.message ||
        `データ取込に失敗しました。HTTP ${response.status}`
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

  function writeResultLog(
    result,
    writeLog
  ) {
    if (!writeLog || !result) {
      return;
    }

    const fields = [
      "message",
      "requested_url",
      "document_count",
      "row_inserted",
      "row_skipped",
      "file_id",
      "gcs_path"
    ];

    fields.forEach(
      field => {
        if (
          result[field] !== undefined &&
          result[field] !== null &&
          result[field] !== ""
        ) {
          writeLog(
            `${field}=${result[field]}`
          );
        }
      }
    );
  }

  window.DataImportNone = {
    run
  };
})();
