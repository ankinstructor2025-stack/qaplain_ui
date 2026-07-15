/**
 * data_import.js
 *
 * 役割
 * - 共通ツールバーで選択されたデータソースを保持
 * - source_typeに応じて入力パネルを切り替え
 * - ファイルデータソースの対象拡張子で選択対象を制限
 * - 取込実行前にファイル拡張子を再検証
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


console.log(
  "data_import.js loaded"
);


const API_BASE =
  API_BASE_URL;


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


const uploadFileInput =
  document.getElementById(
    "uploadFileInput"
  );

const uploadFileName =
  document.getElementById(
    "uploadFileName"
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

let currentDataSource =
  null;


/**
 * ログ出力
 */
function writeLog(
  message
) {
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


/**
 * ログ消去
 */
function clearLog() {
  if (logText) {
    logText.textContent =
      "";
  }
}


/**
 * 現在のFirebase IDトークン取得
 */
async function getCurrentIdToken() {
  const user =
    await waitForLogin();

  return await user.getIdToken();
}


/**
 * データソース種別正規化
 */
function normalizeSourceType(
  value
) {
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


/**
 * 認証方式正規化
 */
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


/**
 * 拡張子正規化
 *
 * 例:
 * ".PDF" → "pdf"
 */
function normalizeExtension(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /^\.+/,
      ""
    );
}


/**
 * ファイル名から拡張子取得
 *
 * 例:
 * "sample.test.pdf" → "pdf"
 */
function getFileExtension(
  fileName
) {
  const normalizedName =
    String(
      fileName || ""
    ).trim();

  const dotIndex =
    normalizedName.lastIndexOf(
      "."
    );

  if (
    dotIndex < 0 ||
    dotIndex ===
      normalizedName.length - 1
  ) {
    return "";
  }

  return normalizeExtension(
    normalizedName.substring(
      dotIndex + 1
    )
  );
}


/**
 * データソースに保存された対象拡張子を取得
 *
 * 対応形式:
 * extensions: ["csv", "pdf"]
 *
 * または
 *
 * extensions: [
 *   { extension: "csv" },
 *   { extension: "pdf" }
 * ]
 */
function getAllowedExtensions(
  dataSource
) {
  const sourceExtensions =
    dataSource?.extensions ||
    dataSource?.allowed_extensions ||
    dataSource?.allowed_file_types ||
    dataSource?.file_extensions ||
    [];

  if (
    !Array.isArray(
      sourceExtensions
    )
  ) {
    return [];
  }

  const extensions =
    sourceExtensions
      .map(
        item => {
          if (
            typeof item ===
            "string"
          ) {
            return normalizeExtension(
              item
            );
          }

          return normalizeExtension(
            item?.extension ||
            item?.value ||
            item?.name ||
            ""
          );
        }
      )
      .filter(
        extension =>
          extension
      );

  return [
    ...new Set(
      extensions
    )
  ];
}


/**
 * 対象拡張子をデータソースに統一して格納
 */
function normalizeExtensions(
  source
) {
  const extensions =
    getAllowedExtensions(
      source
    );

  return extensions;
}


/**
 * ファイル選択欄のaccept属性を設定
 */
function updateFileAccept(
  dataSource
) {
  if (!uploadFileInput) {
    return;
  }

  const allowedExtensions =
    getAllowedExtensions(
      dataSource
    );

  if (
    allowedExtensions.length === 0
  ) {
    uploadFileInput.removeAttribute(
      "accept"
    );

    return;
  }

  uploadFileInput.accept =
    allowedExtensions
      .map(
        extension =>
          `.${extension}`
      )
      .join(
        ","
      );
}


/**
 * ファイル選択をクリア
 */
function clearSelectedFiles() {
  if (uploadFileInput) {
    uploadFileInput.value =
      "";
  }

  updateSelectedFileName();
}


/**
 * 選択ファイル名表示
 */
function updateSelectedFileName() {
  if (
    !uploadFileInput ||
    !uploadFileName
  ) {
    return;
  }

  const files =
    Array.from(
      uploadFileInput.files ||
      []
    );

  if (
    files.length === 0
  ) {
    uploadFileName.textContent =
      "ファイルが選択されていません";

    uploadFileName.classList.add(
      "is-empty"
    );

    return;
  }

  uploadFileName.classList.remove(
    "is-empty"
  );

  if (
    files.length === 1
  ) {
    uploadFileName.textContent =
      files[0].name;

    return;
  }

  uploadFileName.textContent =
    `${files.length}件のファイルを選択`;
}


/**
 * 選択ファイルの拡張子検証
 */
function validateSelectedFiles(
  files,
  dataSource
) {
  const fileList =
    Array.from(
      files || []
    );

  if (
    fileList.length === 0
  ) {
    return {
      valid: false,
      message:
        "ファイルを選択してください。"
    };
  }

  const allowedExtensions =
    getAllowedExtensions(
      dataSource
    );

  /*
   * データソースに対象拡張子が設定されていない場合は、
   * 誤って無制限に取り込ませずエラーとする。
   */
  if (
    allowedExtensions.length === 0
  ) {
    return {
      valid: false,
      message:
        "このデータソースには対象拡張子が設定されていません。"
    };
  }

  const invalidFiles =
    fileList.filter(
      file => {
        const extension =
          getFileExtension(
            file.name
          );

        return (
          !extension ||
          !allowedExtensions.includes(
            extension
          )
        );
      }
    );

  if (
    invalidFiles.length === 0
  ) {
    return {
      valid: true,
      message: ""
    };
  }

  const invalidFileNames =
    invalidFiles
      .map(
        file =>
          `・${file.name}`
      )
      .join(
        "\n"
      );

  const allowedExtensionText =
    allowedExtensions
      .map(
        extension =>
          `.${extension}`
      )
      .join(
        ", "
      );

  return {
    valid: false,

    message:
      "対象外の拡張子が含まれています。\n\n" +
      invalidFileNames +
      "\n\n使用可能な拡張子:\n" +
      allowedExtensionText
  };
}


/**
 * ファイル選択時処理
 */
function handleUploadFileChange() {
  updateSelectedFileName();

  if (
    !uploadFileInput ||
    !currentDataSource
  ) {
    return;
  }

  const files =
    Array.from(
      uploadFileInput.files ||
      []
    );

  if (
    files.length === 0
  ) {
    return;
  }

  const validation =
    validateSelectedFiles(
      files,
      currentDataSource
    );

  if (validation.valid) {
    return;
  }

  alert(
    validation.message
  );

  clearSelectedFiles();
}


/**
 * 全パネル非表示
 */
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


/**
 * 未選択パネル表示
 */
function showEmptyPanel() {
  hideAllPanels();

  panelEmpty?.classList.remove(
    "hidden"
  );
}


/**
 * データソースに対応するパネル表示
 */
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

  if (
    sourceType === "file"
  ) {
    updateFileAccept(
      dataSource
    );

    panelUpload?.classList.remove(
      "hidden"
    );

    return;
  }

  if (
    sourceType === "url"
  ) {
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


/**
 * データソース情報正規化
 */
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
      ),

    extensions:
      normalizeExtensions(
        source
      )
  };
}


/**
 * データソース詳細取得
 */
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
   * ファイルデータソースは対象拡張子が必要なので、
   * 必ず詳細APIから取得する。
   */
  if (
    normalized.source_type !== "file" &&
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


/**
 * 選択されたデータソースの取込実行
 */
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
      dataSource.source_type ===
      "file"
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
          `未対応の認証方式です: ${
            methodKey ||
            "未設定"
          }`
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


/**
 * ファイル取込
 */
async function runFileImport({
  idToken,
  dataSource
}) {
  const validation =
    validateSelectedFiles(
      uploadFileInput?.files,
      dataSource
    );

  if (!validation.valid) {
    throw new Error(
      validation.message
    );
  }

  validateModule(
    window.DataImportFile,
    "data_import_file.js"
  );

  return await window.DataImportFile.run({
    apiBase:
      API_BASE,

    idToken,

    dataSource,

    files:
      Array.from(
        uploadFileInput?.files ||
        []
      ),

    writeLog
  });
}


/**
 * 認証なし取込
 */
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


/**
 * Basic認証取込
 */
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


/**
 * Client Credentials取込
 */
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


/**
 * 分割JS読込確認
 */
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


/**
 * 共通ツールバーイベント
 */
function bindToolbarEvents() {
  document.addEventListener(
    "toolbar:ready",
    event => {
      const detail =
        event.detail ||
        {};

      sourceMap =
        detail.sourceMap ||
        {};

      currentDataSource =
        null;

      clearSelectedFiles();
      showEmptyPanel();

      if (detail.error) {
        writeLog(
          `データソース取得失敗: ${
            detail.error.message ||
            detail.error
          }`
        );
      }
    }
  );

  document.addEventListener(
    "toolbar:source-change",
    async event => {
      const detail =
        event.detail ||
        {};

      const sourceId =
        detail.dataSourceId ||
        detail.sourceId ||
        detail.sourceKey ||
        "";

      if (!sourceId) {
        currentDataSource =
          null;

        clearSelectedFiles();
        showEmptyPanel();

        return;
      }

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
        normalizeDataSource(
          source
        );

      clearSelectedFiles();

      /*
       * ファイルデータソースは選択直後に詳細を取得し、
       * accept属性へ対象拡張子を反映する。
       */
      if (
        currentDataSource.source_type ===
        "file"
      ) {
        try {
          currentDataSource =
            await loadDataSourceDetail(
              currentDataSource
            );

          const allowedExtensions =
            getAllowedExtensions(
              currentDataSource
            );

          updateFileAccept(
            currentDataSource
          );

          if (
            allowedExtensions.length >
            0
          ) {
            writeLog(
              "対象拡張子: " +
              allowedExtensions
                .map(
                  extension =>
                    `.${extension}`
                )
                .join(
                  ", "
                )
            );
          } else {
            writeLog(
              "対象拡張子が設定されていません。"
            );
          }

        } catch (error) {
          console.error(
            "データソース詳細取得エラー:",
            error
          );

          uploadFileInput?.removeAttribute(
            "accept"
          );

          writeLog(
            `データソース設定取得失敗: ${
              error.message
            }`
          );

          alert(
            error.message ||
            "データソース設定を取得できませんでした。"
          );
        }
      }

      showPanelForDataSource(
        currentDataSource
      );
    }
  );
}


/**
 * 取込ボタン共通処理
 */
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


/**
 * 初期化
 */
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

  uploadFileInput?.addEventListener(
    "change",
    handleUploadFileChange
  );

  btnClearLog?.addEventListener(
    "click",
    clearLog
  );

  if (
    typeof window.renderPageToolbar !==
    "function"
  ) {
    throw new Error(
      "common_toolbar.jsを読み込めませんでした。"
    );
  }

  await window.renderPageToolbar({
    mountId:
      "pageToolbar",

    title:
      "データ取込",

    showSourceSelect:
      true,

    showDbSelect:
      false,

    enableDbAutoLoad:
      false,

    actions: [
      {
        id:
          "btnMenu",

        label:
          "メニュー"
      },
      {
        id:
          "btnLogout",

        label:
          "ログアウト"
      }
    ]
  });
}


/**
 * DOM読込後に初期化
 */
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