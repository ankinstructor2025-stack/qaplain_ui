/**
 * data_import.js
 *
 * 役割
 * - 共通ツールバーで選択されたデータソースを保持
 * - source_typeに応じて入力パネルを切り替え
 * - authentication_method_keyに応じて取込処理を振り分け
 *
 * 使用する処理:
 * - DataImportFile
 * - DataImportNone
 * - DataImportBasic
 * - DataImportClientCredentials
 */

import {
  API_BASE_URL
} from "./config.js";

import {
  waitForLogin,
  authenticatedJsonOrThrow
} from "./common.js";

import "./common_toolbar.js";

console.log("data_import.js loaded");

const API_BASE = API_BASE_URL;

const panelEmpty =
  document.getElementById(
    "panelEmpty"
  );

const panelUpload =
  document.getElementById(
    "panelUpload"
  );

const panelUrl =
  document.getElementById(
    "panelUrl"
  );

const panelApi =
  document.getElementById(
    "panelApi"
  );

/*
 * 旧画面との互換用。
 * panelApiがHTMLにない場合だけ使用する。
 */
const panelKokkai =
  document.getElementById(
    "panelKokkai"
  );

const panelOpenData =
  document.getElementById(
    "panelOpenData"
  );

const logText =
  document.getElementById(
    "logText"
  );

const btnClearLog =
  document.getElementById(
    "btnClearLog"
  );

const btnUploadRegister =
  document.getElementById(
    "btnUploadRegister"
  );

const btnUrlRegister =
  document.getElementById(
    "btnUrlRegister"
  );

const btnApiRegister =
  document.getElementById(
    "btnApiRegister"
  );

/*
 * 旧HTMLのボタンIDとの互換用。
 */
const btnKokkaiRegister =
  document.getElementById(
    "btnKokkaiRegister"
  );

const btnFetchDatasets =
  document.getElementById(
    "btnFetchDatasets"
  );

let sourceMap = {};
let currentDataSource = null;


function writeLog(message) {
  if (!logText) {
    return;
  }

  const now =
    new Date();

  const hh =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );

  const mm =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );

  const ss =
    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    );

  logText.textContent +=
    `[${hh}:${mm}:${ss}] ${String(message ?? "")}\n`;

  logText.scrollTop =
    logText.scrollHeight;
}


function clearLog() {
  if (logText) {
    logText.textContent = "";
  }
}


async function getCurrentIdToken() {
const user = await waitForLogin();
return await user.getIdToken();
}


function normalizeSourceType(value) {
  const sourceType =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /-/g,
        "_"
      );

  switch (sourceType) {
    case "upload":
      return "file";

    case "public_url":
      return "url";

    case "public_api":
      return "api";

    case "email":
      return "mail";

    default:
      return sourceType;
  }
}


function normalizeAuthenticationMethodKey(
  value
) {
  const methodKey =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /-/g,
        "_"
      );

  switch (methodKey) {
    case "":
    case "none":
    case "no_auth":
    case "no_authentication":
      return "none";

    case "credential":
    case "credentials":
      return "client_credentials";

    default:
      return methodKey;
  }
}


function hideAllPanels() {
  [
    panelEmpty,
    panelUpload,
    panelUrl,
    panelApi,
    panelKokkai,
    panelOpenData
  ].forEach(
    panel => {
      panel?.classList.add(
        "hidden"
      );
    }
  );
}


function showEmptyPanel() {
  hideAllPanels();

  panelEmpty?.classList.remove(
    "hidden"
  );
}


function showPanelForDataSource(
  dataSource
) {
  hideAllPanels();

  if (!dataSource) {
    panelEmpty?.classList.remove(
      "hidden"
    );
    return;
  }

  const sourceType =
    normalizeSourceType(
      dataSource.source_type
    );

  if (sourceType === "file") {
    panelUpload?.classList.remove(
      "hidden"
    );
    return;
  }

  if (sourceType === "url") {
    panelUrl?.classList.remove(
      "hidden"
    );
    return;
  }

  if (
    sourceType === "api" ||
    sourceType === "mail"
  ) {
    /*
     * 新HTMLではpanelApiを使用。
     * 旧HTMLではpanelKokkaiまたはpanelOpenDataを代替表示。
     */
    const apiPanel =
      panelApi ||
      panelKokkai ||
      panelOpenData;

    apiPanel?.classList.remove(
      "hidden"
    );

    return;
  }

  panelEmpty?.classList.remove(
    "hidden"
  );
}


function normalizeDataSource(
  source
) {
  if (!source) {
    return null;
  }

  return {
    ...source,

    data_source_id:
      String(
        source.data_source_id ||
        source.sourceId ||
        source.sourceKey ||
        source.key ||
        ""
      ).trim(),

    data_source_name:
      String(
        source.data_source_name ||
        source.dataSourceName ||
        source.sourceLabel ||
        source.label ||
        ""
      ).trim(),

    source_type:
      normalizeSourceType(
        source.source_type ||
        source.sourceType ||
        source.type
      ),

    authentication_method_key:
      normalizeAuthenticationMethodKey(
        source.authentication_method_key ||
        source.authenticationMethodKey
      )
  };
}


async function loadDataSourceDetail(
  dataSource
) {
  const normalized =
    normalizeDataSource(
      dataSource
    );

  if (
    !normalized ||
    !normalized.data_source_id
  ) {
    throw new Error(
      "データソースが選択されていません。"
    );
  }

  /*
   * 一覧APIに認証方式が含まれていれば再取得しない。
   * ファイルは認証方式を必要としない。
   */
  if (
    normalized.source_type === "file" ||
    normalized.authentication_method_key
  ) {
    return normalized;
  }

  const body =
    await authenticatedJsonOrThrow(
      `${API_BASE}/data-sources/${
        encodeURIComponent(
          normalized.data_source_id
        )
      }`,
      {
        method: "GET"
      }
    );

  return normalizeDataSource(
    body?.data_source ||
    body
  );
}


async function runSelectedDataImport() {
  if (!currentDataSource) {
    alert(
      "データソースを選択してください。"
    );
    return;
  }

  let dataSource;

  try {
    dataSource =
      await loadDataSourceDetail(
        currentDataSource
      );

    currentDataSource =
      dataSource;

    const idToken =
      await getCurrentIdToken();

    writeLog(
      `データソース: ${dataSource.data_source_name}`
    );

    if (
      dataSource.source_type === "file"
    ) {
      await runFileImport({
        idToken,
        dataSource
      });

      return;
    }

    const methodKey =
      normalizeAuthenticationMethodKey(
        dataSource.authentication_method_key
      );

    switch (methodKey) {
      case "none":
        await runNoneImport({
          idToken,
          dataSource
        });
        return;

      case "basic":
        await runBasicImport({
          idToken,
          dataSource
        });
        return;

      case "client_credentials":
        await runClientCredentialsImport({
          idToken,
          dataSource
        });
        return;

      default:
        throw new Error(
          `未対応の認証方式です: ${methodKey || "未設定"}`
        );
    }

  } catch (error) {
    console.error(
      error
    );

    writeLog(
      `処理失敗: ${error.message}`
    );

    alert(
      `処理失敗: ${error.message}`
    );
  }
}


async function runFileImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportFile,
    "data_import_file.js"
  );

  return await window.DataImportFile.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


async function runNoneImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportNone,
    "data_import_none.js"
  );

  return await window.DataImportNone.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


async function runBasicImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportBasic,
    "data_import_basic.js"
  );

  return await window.DataImportBasic.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


async function runClientCredentialsImport({
  idToken,
  dataSource
}) {
  validateModule(
    window.DataImportClientCredentials,
    "data_import_client_credentials.js"
  );

  return await window.DataImportClientCredentials.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    writeLog
  });
}


function validateModule(
  moduleObject,
  fileName
) {
  if (
    !moduleObject ||
    typeof moduleObject.run !==
      "function"
  ) {
    throw new Error(
      `${fileName}が読み込まれていません。`
    );
  }
}



function bindToolbarEvents() {
  document.addEventListener(
    "toolbar:ready",
    event => {
      const detail =
        event.detail || {};

      sourceMap =
        detail.sourceMap || {};

      currentDataSource =
        null;

      showEmptyPanel();

      if (detail.error) {
        writeLog(
          `データソース取得失敗: ${detail.error.message || detail.error}`
        );
      }
    }
  );

  document.addEventListener(
    "toolbar:source-change",
    event => {
      const detail =
        event.detail || {};

      const sourceId =
        detail.dataSourceId ||
        detail.sourceId ||
        detail.sourceKey ||
        "";

      const source =
        detail.dataSource ||
        sourceMap[sourceId] ||
        {
          data_source_id:
            sourceId,

          data_source_name:
            detail.dataSourceName ||
            detail.sourceLabel ||
            "",

          source_type:
            detail.sourceType ||
            "",

          authentication_method_key:
            detail.authenticationMethodKey ||
            ""
        };

      currentDataSource =
        sourceId
          ? normalizeDataSource(
              source
            )
          : null;

      showPanelForDataSource(
        currentDataSource
      );
    }
  );
}


function bindActionButton(
  button
) {
  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      button.disabled =
        true;

      try {
        await runSelectedDataImport();

      } finally {
        button.disabled =
          false;
      }
    }
  );
}


async function initialize() {
  showEmptyPanel();
  bindToolbarEvents();

  bindActionButton(
    btnUploadRegister
  );

  bindActionButton(
    btnUrlRegister
  );

  bindActionButton(
    btnApiRegister
  );

  /*
   * 旧HTMLのボタンも同じ共通処理へ接続する。
   */
  bindActionButton(
    btnKokkaiRegister
  );

  bindActionButton(
    btnFetchDatasets
  );

  btnClearLog?.addEventListener(
    "click",
    clearLog
  );

  if (typeof window.renderPageToolbar !== "function") {
    throw new Error(
      "common_toolbar.jsを読み込めませんでした。"
    );
  }

  await window.renderPageToolbar({
    mountId: "pageToolbar",
    title: "データ取込",
    showSourceSelect: true,
    showDbSelect: false,
    enableDbAutoLoad: false,
    actions: [
      {
        id: "btnMenu",
        label: "メニュー"
      },
      {
        id: "btnLogout",
        label: "ログアウト"
      }
    ]
  });
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    initialize().catch(
      error => {
        console.error(
          "データ取込画面初期化エラー:",
          error
        );

        alert(
          error.message ||
          "画面の初期化に失敗しました。"
        );
      }
    );
  }
);

window.DataImport = {
  run:
    runSelectedDataImport,

  getCurrentDataSource:
    () => (
      currentDataSource
        ? {
            ...currentDataSource
          }
        : null
    ),

  writeLog,
  clearLog
};
