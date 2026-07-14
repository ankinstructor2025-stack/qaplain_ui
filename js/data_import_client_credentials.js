/**
 * data_import_client_credentials.js
 *
 * Client Credentials認証を使用するデータソースの取込処理
 *
 * API:
 * POST /data-import/client-credentials
 *
 * JSON:
 * {
 *   "data_source_id": "..."
 * }
 *
 * client_id・client_secret・token_url・scopeは
 * ブラウザへ返さず、API側がFirestoreから取得する。
 */

console.log(
  "data_import_client_credentials.js loaded"
);

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
      `Client Credentialsデータ取込開始: ${dataSource.data_source_name}`
    );

    const response = await fetch(
      `${apiBase}/data-import/client-credentials`,
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
      "Client Credentialsデータ取込完了"
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

    const methodKey =
      normalizeMethodKey(
        dataSource.authentication_method_key
      );

    if (
      methodKey !==
      "client_credentials"
    ) {
      throw new Error(
        "Client Credentials認証のデータソースではありません。"
      );
    }
  }

  function normalizeMethodKey(
    value
  ) {
    const key =
      String(
        value || ""
      )
        .trim()
        .toLowerCase()
        .replace(
          /-/g,
          "_"
        );

    if (
      key === "credential" ||
      key === "credentials"
    ) {
      return "client_credentials";
    }

    return key;
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
        `Client Credentialsデータ取込に失敗しました。HTTP ${response.status}`
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
      "token_url",
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

  window.DataImportClientCredentials = {
    run
  };
})();
