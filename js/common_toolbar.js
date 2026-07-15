import {
  auth
} from "./firebase-config.js";

import {
  API_BASE_URL
} from "./config.js";

import {
  waitForLogin,
  authenticatedJsonOrThrow
} from "./common.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * common_toolbar.js
 *
 * 役割
 * - 共通ツールバー描画
 * - /data-sources から有効なデータソースを取得
 * - データソース選択変更をカスタムイベントで通知
 * - enableDbAutoLoad=true の場合のみナレッジDB一覧を取得
 * - メニュー / ログアウトの共通動作
 *
 * 発火イベント
 * - toolbar:ready
 * - toolbar:source-change
 * - toolbar:db-change
 */

const DEFAULT_MENU_URL = "./menu.html";
const DEFAULT_LOGOUT_URL = "./index.html";

let toolbarState = {
  mountId: "",
  title: "",
  showSourceSelect: false,
  showDbSelect: false,
  enableDbAutoLoad: false,
  menuUrl: DEFAULT_MENU_URL,
  logoutUrl: DEFAULT_LOGOUT_URL,
  apiBase: API_BASE_URL,
  actions: [],
  sourceList: [],
  sourceMap: {},
  currentSourceId: "",
  currentSourceType: "",
  currentDbName: ""
};


async function renderPageToolbar(options) {
  const opts = normalizeOptions(options);

  toolbarState = {
    ...toolbarState,
    ...opts,
    sourceList: [],
    sourceMap: {},
    currentSourceId: "",
    currentSourceType: "",
    currentDbName: ""
  };

  const mount = document.getElementById(opts.mountId);

  if (!mount) {
    console.error(
      "renderPageToolbar: mount not found:",
      opts.mountId
    );
    return;
  }

  mount.innerHTML = buildToolbarHtml(opts);
  bindCommonActions(opts);

  try {
    await waitForLogin();

    if (!opts.showSourceSelect) {
      dispatchToolbarReady();
      return;
    }

    const sourceList = await loadAvailableDataSources();

    toolbarState.sourceList = sourceList;
    toolbarState.sourceMap = buildSourceMap(sourceList);

    fillSourceSelect(
      sourceList,
      {
        selectId: "sourceSelect",
        placeholder: opts.sourcePlaceholder
      }
    );

    if (opts.showDbSelect) {
      resetDbSelect(
        "データソースを選択してください"
      );
    }

    dispatchToolbarReady();

  } catch (error) {
    console.error(
      "toolbar initialize failed:",
      error
    );

    if (opts.showSourceSelect) {
      fillSourceSelectError(
        "sourceSelect",
        "取得失敗"
      );
    }

    if (opts.showDbSelect) {
      resetDbSelect(
        "取得失敗"
      );
    }

    dispatchToolbarReady(error);
  }
}


function normalizeOptions(options) {
  const src = options || {};

  return {
    mountId: src.mountId || "",

    title: src.title || "",

    showSourceSelect: Boolean(
      src.showSourceSelect
    ),

    showDbSelect: Boolean(
      src.showDbSelect
    ),

    enableDbAutoLoad: Boolean(
      src.enableDbAutoLoad
    ),

    sourcePlaceholder:
      src.sourcePlaceholder ||
      "データソースを選択してください",

    menuUrl:
      src.menuUrl ||
      DEFAULT_MENU_URL,

    logoutUrl:
      src.logoutUrl ||
      DEFAULT_LOGOUT_URL,

    apiBase:
      src.apiBase ||
      API_BASE_URL,

    actions:
      Array.isArray(src.actions)
        ? src.actions
        : []
  };
}


function buildToolbarHtml(opts) {
  const mainClasses = [
    "page-toolbar-main"
  ];

  if (opts.showSourceSelect) {
    mainClasses.push(
      "has-source"
    );
  }

  if (opts.showDbSelect) {
    mainClasses.push(
      "has-db"
    );
  }

  return `
    <div class="page-toolbar">

      <div class="page-toolbar-title">
        ${escapeHtml(opts.title)}
      </div>

      <div class="${mainClasses.join(" ")}">

        ${
          opts.showSourceSelect
            ? `
              <div class="toolbar-field">
                <select
                  id="sourceSelect"
                  class="toolbar-select"
                  disabled
                >
                  <option value="">
                    読込中です...
                  </option>
                </select>
              </div>
            `
            : ""
        }

        ${
          opts.showDbSelect
            ? `
              <div class="toolbar-field">
                <select
                  id="dbSelect"
                  class="toolbar-select"
                  disabled
                >
                  <option value="">
                    データソースを選択してください
                  </option>
                </select>
              </div>
            `
            : ""
        }

      </div>

      <div class="page-toolbar-actions">
        ${
          opts.actions
            .map(
              action => `
                <button
                  id="${escapeHtml(action.id)}"
                  class="btn"
                  type="button"
                >
                  ${escapeHtml(action.label)}
                </button>
              `
            )
            .join("")
        }
      </div>

    </div>
  `;
}


function bindCommonActions(opts) {
  const btnMenu = document.getElementById(
    "btnMenu"
  );

  const btnLogout = document.getElementById(
    "btnLogout"
  );

  const sourceSelect = document.getElementById(
    "sourceSelect"
  );

  const dbSelect = document.getElementById(
    "dbSelect"
  );

  if (btnMenu) {
    btnMenu.addEventListener(
      "click",
      () => {
        window.location.href = opts.menuUrl;
      }
    );
  }

  if (btnLogout) {
    btnLogout.addEventListener(
      "click",
      handleLogout
    );
  }

  if (sourceSelect) {
    sourceSelect.addEventListener(
      "change",
      async () => {
        await handleSourceChange(
          sourceSelect,
          dbSelect
        );
      }
    );
  }

  if (dbSelect) {
    dbSelect.addEventListener(
      "change",
      () => {
        toolbarState.currentDbName =
          dbSelect.value || "";

        dispatchDbChange({
          dbName: toolbarState.currentDbName,
          sourceId: toolbarState.currentSourceId,
          sourceKey: toolbarState.currentSourceId,
          sourceType: toolbarState.currentSourceType
        });
      }
    );
  }
}


async function handleSourceChange(
  sourceSelect,
  dbSelect
) {
  const selectedId =
    sourceSelect.value || "";

  const source =
    toolbarState.sourceMap[selectedId] || null;

  const sourceType = String(
    source?.source_type || ""
  ).trim();

  toolbarState.currentSourceId = selectedId;
  toolbarState.currentSourceType = sourceType;
  toolbarState.currentDbName = "";

  dispatchSourceChange({
    sourceId: selectedId,
    sourceKey: selectedId,
    dataSourceId: selectedId,
    sourceLabel:
      source?.data_source_name || "",
    dataSourceName:
      source?.data_source_name || "",
    sourceType,
    authenticationMethodKey:
      source?.authentication_method_key || "",
    dataSource: source
  });

  if (
    !dbSelect ||
    !toolbarState.enableDbAutoLoad
  ) {
    return;
  }

  if (!selectedId) {
    resetDbSelect(
      "データソースを選択してください"
    );

    dispatchDbChange({
      dbName: "",
      sourceId: "",
      sourceKey: "",
      sourceType: ""
    });

    return;
  }

  try {
    resetDbSelect(
      "読込中です..."
    );

    const dbItems = await loadKnowledgeDbs(
      selectedId,
      sourceType
    );

    fillDbSelect(
      dbItems,
      "選択してください"
    );

  } catch (error) {
    console.error(
      "knowledge db load failed:",
      error
    );

    resetDbSelect(
      "取得失敗"
    );
  }

  dispatchDbChange({
    dbName: "",
    sourceId: selectedId,
    sourceKey: selectedId,
    sourceType
  });
}


async function loadAvailableDataSources() {
  const data =
    await authenticatedJsonOrThrow(
      buildApiUrl(
        toolbarState.apiBase,
        "data-sources"
      ),
      {
        method: "GET"
      }
    );

  const items =
    Array.isArray(data?.data_sources)
      ? data.data_sources
      : [];

  return items
    .filter(
      item =>
        item &&
        item.data_source_id &&
        item.data_source_name &&
        item.enabled !== false
    )
    .map(
      item => ({
        data_source_id: String(
          item.data_source_id
        ),

        data_source_name: String(
          item.data_source_name
        ),

        source_type: normalizeSourceType(
          item.source_type
        ),

        authentication_method_key:
          normalizeAuthenticationMethodKey(
            item.authentication_method_key
          )
      })
    )
    .sort(
      (a, b) =>
        a.data_source_name.localeCompare(
          b.data_source_name,
          "ja"
        )
    );
}


async function loadKnowledgeDbs(
  dataSourceId,
  sourceType
) {
  const url = new URL(
    buildApiUrl(
      toolbarState.apiBase,
      "knowledge/dbs"
    )
  );

  url.searchParams.set(
    "data_source_id",
    dataSourceId
  );

  if (sourceType) {
    url.searchParams.set(
      "source_type",
      sourceType
    );
  }

  const data =
    await authenticatedJsonOrThrow(
      url.toString(),
      {
        method: "GET"
      }
    );

  const items =
    Array.isArray(data?.items)
      ? data.items
      : [];

  return items
    .map(
      item => ({
        dbName: String(
          item?.database_name ||
          item?.db_name ||
          ""
        ).trim()
      })
    )
    .filter(
      item => item.dbName
    );
}


function buildSourceMap(sourceList) {
  const map = {};

  sourceList.forEach(
    source => {
      map[source.data_source_id] = source;
    }
  );

  return map;
}


function fillSourceSelect(
  sourceList,
  options
) {
  const select = document.getElementById(
    options.selectId
  );

  if (!select) {
    return;
  }

  const placeholder =
    options.placeholder ||
    "データソースを選択してください";

  let html =
    `<option value="">${escapeHtml(placeholder)}</option>`;

  sourceList.forEach(
    source => {
      html += `
        <option
          value="${escapeHtml(source.data_source_id)}"
          data-source-type="${escapeHtml(source.source_type)}"
          data-authentication-method-key="${escapeHtml(source.authentication_method_key)}"
        >
          ${escapeHtml(source.data_source_name)}
        </option>
      `;
    }
  );

  select.innerHTML = html;
  select.disabled = false;
}


function fillSourceSelectError(
  selectId,
  message
) {
  const select = document.getElementById(
    selectId
  );

  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">${escapeHtml(message || "取得失敗")}</option>`;

  select.disabled = true;
}


function fillDbSelect(
  dbItems,
  placeholder
) {
  const select = document.getElementById(
    "dbSelect"
  );

  if (!select) {
    return;
  }

  if (
    !Array.isArray(dbItems) ||
    dbItems.length === 0
  ) {
    resetDbSelect(
      "該当するナレッジDBがありません"
    );
    return;
  }

  let html =
    `<option value="">${escapeHtml(placeholder || "選択してください")}</option>`;

  dbItems.forEach(
    item => {
      html += `
        <option value="${escapeHtml(item.dbName)}">
          ${escapeHtml(item.dbName)}
        </option>
      `;
    }
  );

  select.innerHTML = html;
  select.disabled = false;
}


function resetDbSelect(message) {
  const select = document.getElementById(
    "dbSelect"
  );

  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">${escapeHtml(message || "選択してください")}</option>`;

  select.disabled = true;
}


function buildApiUrl(
  apiBase,
  path
) {
  const base = String(
    apiBase || ""
  ).replace(
    /\/+$/,
    ""
  );

  const normalizedPath = String(
    path || ""
  ).replace(
    /^\/+/,
    ""
  );

  return `${base}/${normalizedPath}`;
}


function normalizeAuthenticationMethodKey(value) {
  const methodKey = String(
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


function normalizeSourceType(value) {
  const sourceType = String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /-/g,
      "_"
    );

  switch (sourceType) {
    case "file":
    case "upload":
      return "file";

    case "mail":
    case "email":
      return "mail";

    case "url":
    case "public_url":
      return "url";

    case "api":
    case "public_api":
      return "api";

    default:
      return sourceType;
  }
}


async function handleLogout() {
  try {
    await signOut(auth);

  } catch (error) {
    console.error(
      "logout failed:",
      error
    );

    alert(
      "ログアウトに失敗しました。"
    );

    return;
  }

  window.location.href =
    toolbarState.logoutUrl;
}


function dispatchToolbarReady(error = null) {
  document.dispatchEvent(
    new CustomEvent(
      "toolbar:ready",
      {
        detail: {
          sourceList:
            toolbarState.sourceList.slice(),

          sourceMap: {
            ...toolbarState.sourceMap
          },

          error
        }
      }
    )
  );
}


function dispatchSourceChange(detail) {
  document.dispatchEvent(
    new CustomEvent(
      "toolbar:source-change",
      {
        detail
      }
    )
  );
}


function dispatchDbChange(detail) {
  document.dispatchEvent(
    new CustomEvent(
      "toolbar:db-change",
      {
        detail
      }
    )
  );
}


function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#39;"
    );
}


function getToolbarSourceList() {
  return toolbarState.sourceList.slice();
}


function getToolbarSourceMap() {
  return {
    ...toolbarState.sourceMap
  };
}


function getSelectedSource() {
  const select = document.getElementById(
    "sourceSelect"
  );

  if (!select) {
    return null;
  }

  const sourceId = select.value || "";

  return toolbarState.sourceMap[
    sourceId
  ] || null;
}


function getSelectedDbName() {
  const select = document.getElementById(
    "dbSelect"
  );

  if (!select) {
    return "";
  }

  return select.value || "";
}


window.renderPageToolbar =
  renderPageToolbar;

window.getToolbarSourceList =
  getToolbarSourceList;

window.getToolbarSourceMap =
  getToolbarSourceMap;

window.getSelectedSource =
  getSelectedSource;

window.getSelectedDbName =
  getSelectedDbName;
