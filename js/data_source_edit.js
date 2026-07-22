import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

import {
    normalizeAuthenticationMethodKey,
    normalizeFileExtension,
    renderFileExtensionList
} from "./data_source_common.js";

import {
    handleAuthenticationMethodChanged,
    handleProcessingPatternChanged,
    handleSourceTypeChanged,
    resetScreen,
    setDataSourceValues
} from "./data_source_screen.js";

import {
    handleAddParameter,
    renderParameters
} from "./data_source_parameter.js";

import {
    validateInput
} from "./data_source_validation.js";

import {
    createRequestBody
} from "./data_source_request.js";

import {
    createParentDisplayFieldUi,
    handleAddParentDisplayField,
    renderParentDisplayFields
} from "./data_source_display_field.js";

const queryParameters =
    new URLSearchParams(location.search);

const dataSourceId =
    queryParameters.get("id");

const isEditMode =
    Boolean(dataSourceId);

const dom = {
    pageTitle:
        document.getElementById("pageTitle"),
    tenantSelect:
        document.getElementById("tenantSelect"),
    dataSourceNameInput:
        document.getElementById("dataSourceName"),
    sourceTypeSelect:
        document.getElementById("sourceTypeSelect"),
    processingPatternSelect:
        document.getElementById("processingPattern"),
    processingPatternSettings:
        document.getElementById("processingPatternSettings"),
    jsonListSettings:
        document.getElementById("jsonListSettings"),
    parentChildSettings:
        document.getElementById("parentChildSettings"),
    parentChildGrandchildSettings:
        document.getElementById("parentChildGrandchildSettings"),
    fileLinkSettings:
        document.getElementById("fileLinkSettings"),
    listArrayPathInput:
        document.getElementById("listArrayPath"),
    parentArrayPathInput:
        document.getElementById("parentArrayPath"),
    childArrayPathInput:
        document.getElementById("childArrayPath"),
    grandParentArrayPathInput:
        document.getElementById("grandParentArrayPath"),
    grandChildArrayPathInput:
        document.getElementById("grandChildArrayPath"),
    grandchildArrayPathInput:
        document.getElementById("grandchildArrayPath"),
    fileLinkArrayPathInput:
        document.getElementById("fileLinkArrayPath"),
    fileLinkFieldNameInput:
        document.getElementById("fileLinkFieldName"),
    fileSettings:
        document.getElementById("fileSettings"),
    mailSettings:
        document.getElementById("mailSettings"),
    connectionSettings:
        document.getElementById("connectionSettings"),
    httpMethodRow:
        document.getElementById("httpMethodRow"),
    fileExtensionList:
        document.getElementById("fileExtensionList"),
    mailExtensionsInput:
        document.getElementById("mailExtensions"),
    endpointUrlInput:
        document.getElementById("endpointUrl"),
    httpMethodSelect:
        document.getElementById("httpMethod"),
    authenticationMethodSelect:
        document.getElementById("authenticationMethodSelect"),
    basicAuthenticationFields:
        document.getElementById("basicAuthenticationFields"),
    clientCredentialsFields:
        document.getElementById("clientCredentialsFields"),
    basicUsernameInput:
        document.getElementById("basicUsername"),
    basicPasswordInput:
        document.getElementById("basicPassword"),
    clientIdInput:
        document.getElementById("clientId"),
    clientSecretInput:
        document.getElementById("clientSecret"),
    tokenUrlInput:
        document.getElementById("tokenUrl"),
    scopeInput:
        document.getElementById("scope"),
    enabledInput:
        document.getElementById("enabled"),
    parameterNameInput:
        document.getElementById("parameterName"),
    parameterValueInput:
        document.getElementById("parameterValue"),
    parameterList:
        document.getElementById("parameterList"),
    addParameterButton:
        document.getElementById("addParameterButton"),
    saveButton:
        document.getElementById("saveButton"),
    backButton:
        document.getElementById("backButton")
};

const state = {
    parameters: [],
    parentDisplayFields: [],
    availableFileTypes: [],
    legacyDataFormat: ""
};

document.addEventListener(
    "DOMContentLoaded",
    initialize
);

async function initialize() {
    try {
        createParentDisplayFieldUi(dom);
        validateRequiredElements();

        await waitForLogin();

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {
            alert("管理権限がありません。");
            location.href = "./menu.html";
            return;
        }

        registerEvents();

        await Promise.all([
            loadTenants(),
            loadAuthenticationMethods(),
            loadAvailableFileTypes()
        ]);

        resetScreen(dom, state);
        renderParameters(dom, state);
        renderParentDisplayFields(dom, state);

        if (isEditMode) {
            dom.pageTitle.textContent =
                "データソース編集";

            await loadDataSource();
        } else {
            dom.pageTitle.textContent =
                "データソース登録";
        }
    } catch (error) {
        console.error(
            "データソース編集画面初期化エラー:",
            error
        );

        alert(
            error.message ||
            "画面の初期化に失敗しました。"
        );

        location.href =
            "./data_source_maintenance.html";
    }
}

function validateRequiredElements() {
    const missing = Object.entries(dom)
        .filter(([, element]) => !element)
        .map(([name]) => name);

    if (missing.length) {
        throw new Error(
            `HTML要素が見つかりません: ${missing.join(", ")}`
        );
    }
}

function registerEvents() {
    dom.sourceTypeSelect.addEventListener(
        "change",
        () => {
            handleSourceTypeChanged(dom);
            handleAuthenticationMethodChanged(dom);
        }
    );

    dom.processingPatternSelect.addEventListener(
        "change",
        () => {
            handleProcessingPatternChanged(
                dom,
                true
            );

            handleSourceTypeChanged(dom);
        }
    );

    dom.authenticationMethodSelect.addEventListener(
        "change",
        () =>
            handleAuthenticationMethodChanged(dom)
    );

    dom.addParameterButton.addEventListener(
        "click",
        () =>
            handleAddParameter(dom, state)
    );

    dom.addParentDisplayFieldButton.addEventListener(
        "click",
        () =>
            handleAddParentDisplayField(dom, state)
    );

    dom.saveButton.addEventListener(
        "click",
        handleSave
    );

    dom.backButton.addEventListener(
        "click",
        handleBack
    );
}

async function loadTenants() {
    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/tenants`,
            {
                method: "GET"
            }
        );

    const tenants =
        Array.isArray(result)
            ? result
            : result.tenants || [];

    dom.tenantSelect.innerHTML = "";

    const placeholder =
        document.createElement("option");

    placeholder.value = "";
    placeholder.textContent =
        "テナントを選択してください";

    dom.tenantSelect.appendChild(placeholder);

    tenants.forEach(tenant => {
        const tenantId =
            tenant.id ||
            tenant.tenant_id ||
            "";

        if (!tenantId) {
            return;
        }

        const option =
            document.createElement("option");

        option.value = tenantId;
        option.textContent =
            tenant.tenant_name ||
            tenantId;

        dom.tenantSelect.appendChild(option);
    });
}

async function loadAuthenticationMethods() {
    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/authentication-methods/available`,
            {
                method: "GET"
            }
        );

    const methods =
        Array.isArray(result)
            ? result
            : result.authentication_methods || [];

    dom.authenticationMethodSelect.innerHTML = "";

    const placeholder =
        document.createElement("option");

    placeholder.value = "";
    placeholder.textContent =
        "認証方式を選択してください";

    dom.authenticationMethodSelect.appendChild(
        placeholder
    );

    methods
        .filter(method => method.enabled !== false)
        .forEach(method => {
            const option =
                document.createElement("option");

            option.value =
                normalizeAuthenticationMethodKey(
                    method.method_key
                );

            option.textContent =
                method.display_name ||
                method.method_key ||
                "";

            dom.authenticationMethodSelect.appendChild(
                option
            );
        });
}

async function loadAvailableFileTypes() {
    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/file-types/available`,
            {
                method: "GET"
            }
        );

    const fileTypes =
        Array.isArray(result)
            ? result
            : result.file_types || [];

    state.availableFileTypes = fileTypes
        .filter(fileType => fileType.enabled !== false)
        .map(fileType => ({
            extension:
                normalizeFileExtension(
                    fileType.extension
                )
        }))
        .filter(fileType => fileType.extension)
        .sort(
            (first, second) =>
                first.extension.localeCompare(
                    second.extension
                )
        );

    renderFileExtensionList(
        dom,
        state.availableFileTypes
    );
}

async function loadDataSource() {
    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/data-sources/${encodeURIComponent(
                dataSourceId
            )}`,
            {
                method: "GET"
            }
        );

    const dataSource =
        result.data_source ||
        result;

    setDataSourceValues(
        dom,
        state,
        dataSource
    );

    renderParameters(
        dom,
        state
    );

    renderParentDisplayFields(
        dom,
        state
    );
}

async function handleSave() {
    const validationMessage =
        validateInput(
            dom,
            isEditMode
        );

    if (validationMessage) {
        alert(validationMessage);
        return;
    }

    const body =
        createRequestBody(
            dom,
            state
        );

    try {
        const requestUrl =
            isEditMode
                ? `${API_BASE_URL}/data-sources/${encodeURIComponent(
                    dataSourceId
                )}`
                : `${API_BASE_URL}/data-sources`;

        const requestMethod =
            isEditMode
                ? "PUT"
                : "POST";

        const result =
            await authenticatedJsonOrThrow(
                requestUrl,
                {
                    method: requestMethod,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(body)
                }
            );

        alert(
            result.message ||
            (
                isEditMode
                    ? "データソースを更新しました。"
                    : "データソースを登録しました。"
            )
        );

        location.href =
            "./data_source_maintenance.html";
    } catch (error) {
        console.error(
            "データソース保存エラー:",
            error
        );

        alert(
            error.message ||
            "データソースの保存に失敗しました。"
        );
    }
}

function handleBack() {
    location.href =
        "./data_source_maintenance.html";
}
