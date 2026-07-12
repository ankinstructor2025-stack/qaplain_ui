import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const queryParameters =
    new URLSearchParams(
        location.search
    );

const dataSourceId =
    queryParameters.get(
        "id"
    );

const isEditMode =
    Boolean(
        dataSourceId
    );


const pageTitle =
    document.getElementById(
        "pageTitle"
    );

const dataSourceNameInput =
    document.getElementById(
        "dataSourceName"
    );

const sourceTypeSelect =
    document.getElementById(
        "sourceTypeSelect"
    );

const fileSettings =
    document.getElementById(
        "fileSettings"
    );

const mailSettings =
    document.getElementById(
        "mailSettings"
    );

const connectionSettings =
    document.getElementById(
        "connectionSettings"
    );

const httpMethodRow =
    document.getElementById(
        "httpMethodRow"
    );

const fileExtensionsInput =
    document.getElementById(
        "fileExtensions"
    );

const mailExtensionsInput =
    document.getElementById(
        "mailExtensions"
    );

const endpointUrlInput =
    document.getElementById(
        "endpointUrl"
    );

const httpMethodSelect =
    document.getElementById(
        "httpMethod"
    );

const authenticationMethodSelect =
    document.getElementById(
        "authenticationMethodSelect"
    );

const basicAuthenticationFields =
    document.getElementById(
        "basicAuthenticationFields"
    );

const clientCredentialsFields =
    document.getElementById(
        "clientCredentialsFields"
    );

const basicUsernameInput =
    document.getElementById(
        "basicUsername"
    );

const basicPasswordInput =
    document.getElementById(
        "basicPassword"
    );

const clientIdInput =
    document.getElementById(
        "clientId"
    );

const clientSecretInput =
    document.getElementById(
        "clientSecret"
    );

const tokenUrlInput =
    document.getElementById(
        "tokenUrl"
    );

const scopeInput =
    document.getElementById(
        "scope"
    );

const enabledInput =
    document.getElementById(
        "enabled"
    );

const parameterTypeSelect =
    document.getElementById(
        "parameterType"
    );

const parameterNameInput =
    document.getElementById(
        "parameterName"
    );

const parameterValueInput =
    document.getElementById(
        "parameterValue"
    );

const parameterList =
    document.getElementById(
        "parameterList"
    );

const addParameterButton =
    document.getElementById(
        "addParameterButton"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


let parameters = [];


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await waitForLogin();

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {

            alert(
                "管理権限がありません。"
            );

            location.href =
                "./menu.html";

            return;

        }

        sourceTypeSelect.addEventListener(
            "change",
            handleSourceTypeChanged
        );

        authenticationMethodSelect.addEventListener(
            "change",
            handleAuthenticationMethodChanged
        );

        addParameterButton.addEventListener(
            "click",
            handleAddParameter
        );

        saveButton.addEventListener(
            "click",
            handleSave
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadAuthenticationMethods();

        resetScreen();

        if (isEditMode) {

            pageTitle.textContent =
                "データソース編集";

            await loadDataSource();

        } else {

            pageTitle.textContent =
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


async function loadAuthenticationMethods() {

    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/authentication-methods/available`,
            {
                method: "GET"
            }
        );

    const authenticationMethods =
        Array.isArray(result)
            ? result
            : result.authentication_methods || [];

    authenticationMethodSelect.innerHTML =
        "";

    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "認証方式を選択してください";

    authenticationMethodSelect.appendChild(
        placeholder
    );

    authenticationMethods
        .filter(
            method => method.enabled !== false
        )
        .forEach(
            method => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    normalizeAuthenticationMethodKey(
                        method.method_key
                    );

                option.textContent =
                    method.display_name ||
                    method.method_key ||
                    "";

                authenticationMethodSelect.appendChild(
                    option
                );

            }
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
        dataSource
    );

}


function setDataSourceValues(
    dataSource
) {

    dataSourceNameInput.value =
        dataSource.data_source_name ||
        dataSource.name ||
        "";

    sourceTypeSelect.value =
        normalizeSourceType(
            dataSource.source_type
        );

    fileExtensionsInput.value =
        formatExtensions(
            dataSource.file_extensions
        );

    mailExtensionsInput.value =
        formatExtensions(
            dataSource.file_extensions
        ) || ".eml";

    endpointUrlInput.value =
        dataSource.endpoint_url ||
        dataSource.target_url ||
        "";

    httpMethodSelect.value =
        dataSource.http_method ||
        "GET";

    authenticationMethodSelect.value =
        normalizeAuthenticationMethodKey(
            dataSource.authentication_method_key ||
            dataSource.method_key
        );

    basicUsernameInput.value =
        dataSource.username ||
        dataSource.user_id ||
        "";

    basicPasswordInput.value =
        "";

    clientIdInput.value =
        dataSource.client_id ||
        "";

    clientSecretInput.value =
        "";

    tokenUrlInput.value =
        dataSource.token_url ||
        "";

    scopeInput.value =
        dataSource.scope ||
        "";

    enabledInput.checked =
        dataSource.enabled !== false;

    parameters =
        Array.isArray(
            dataSource.parameters
        )
            ? dataSource.parameters.map(
                (
                    parameter,
                    index
                ) => ({
                    parameter_id:
                        parameter.parameter_id ||
                        parameter.id ||
                        "",

                    parameter_type:
                        normalizeParameterType(
                            parameter.parameter_type
                        ),

                    parameter_name:
                        parameter.parameter_name ||
                        "",

                    parameter_value:
                        parameter.parameter_value ??
                        "",

                    display_order:
                        parameter.display_order ||
                        index + 1
                })
            )
            : [];

    handleSourceTypeChanged();

    handleAuthenticationMethodChanged();

    renderParameters();

}


function handleSourceTypeChanged() {

    hideSourceSettings();

    const sourceType =
        sourceTypeSelect.value;

    if (sourceType === "file") {

        fileSettings.classList.remove(
            "hidden"
        );

        return;

    }

    if (sourceType === "mail") {

        mailSettings.classList.remove(
            "hidden"
        );

        return;

    }

    if (
        sourceType === "url" ||
        sourceType === "api"
    ) {

        connectionSettings.classList.remove(
            "hidden"
        );

    }

    if (sourceType === "api") {

        httpMethodRow.classList.remove(
            "hidden"
        );

    }

}


function hideSourceSettings() {

    fileSettings.classList.add(
        "hidden"
    );

    mailSettings.classList.add(
        "hidden"
    );

    connectionSettings.classList.add(
        "hidden"
    );

    httpMethodRow.classList.add(
        "hidden"
    );

}


function handleAuthenticationMethodChanged() {

    hideAuthenticationFields();

    const methodKey =
        normalizeAuthenticationMethodKey(
            authenticationMethodSelect.value
        );

    if (methodKey === "basic") {

        basicAuthenticationFields.classList.remove(
            "hidden"
        );

        return;

    }

    if (isClientCredentialsMethod(
        methodKey
    )) {

        clientCredentialsFields.classList.remove(
            "hidden"
        );

    }

}


function hideAuthenticationFields() {

    basicAuthenticationFields.classList.add(
        "hidden"
    );

    clientCredentialsFields.classList.add(
        "hidden"
    );

}


function handleAddParameter() {

    const parameterType =
        normalizeParameterType(
            parameterTypeSelect.value
        );

    const parameterName =
        parameterNameInput.value.trim();

    const parameterValue =
        parameterValueInput.value;

    if (!parameterName) {

        alert(
            "パラメータ名を入力してください。"
        );

        return;

    }

    const duplicated =
        parameters.some(
            parameter =>
                parameter.parameter_type === parameterType &&
                parameter.parameter_name === parameterName
        );

    if (duplicated) {

        alert(
            "同じ種類とパラメータ名が登録されています。"
        );

        return;

    }

    parameters.push({
        parameter_id:
            "",

        parameter_type:
            parameterType,

        parameter_name:
            parameterName,

        parameter_value:
            parameterValue,

        display_order:
            parameters.length + 1
    });

    parameterNameInput.value =
        "";

    parameterValueInput.value =
        "";

    renderParameters();

}


function renderParameters() {

    parameterList.innerHTML =
        "";

    if (parameters.length === 0) {

        showParameterMessage(
            "パラメータは登録されていません。"
        );

        return;

    }

    parameters.forEach(
        (
            parameter,
            index
        ) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "list-row";

            row.appendChild(
                createTextColumn(
                    getParameterTypeLabel(
                        parameter.parameter_type
                    ),
                    "20%"
                )
            );

            row.appendChild(
                createTextColumn(
                    parameter.parameter_name,
                    "30%"
                )
            );

            row.appendChild(
                createTextColumn(
                    parameter.parameter_value,
                    "40%"
                )
            );

            row.appendChild(
                createParameterActionColumn(
                    index
                )
            );

            parameterList.appendChild(
                row
            );

        }
    );

}


function createTextColumn(
    text,
    width
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        width;

    column.textContent =
        text ?? "";

    return column;

}


function createParameterActionColumn(
    index
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "10%";

    column.className =
        "list-actions";

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "btn btn-small btn-danger";

    deleteButton.textContent =
        "削除";

    deleteButton.addEventListener(
        "click",
        () => {
            deleteParameter(
                index
            );
        }
    );

    column.appendChild(
        deleteButton
    );

    return column;

}


function deleteParameter(
    index
) {

    parameters.splice(
        index,
        1
    );

    parameters =
        parameters.map(
            (
                parameter,
                parameterIndex
            ) => ({
                ...parameter,

                display_order:
                    parameterIndex + 1
            })
        );

    renderParameters();

}


function showParameterMessage(
    message
) {

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "100%";

    column.textContent =
        message;

    row.appendChild(
        column
    );

    parameterList.appendChild(
        row
    );

}


function validateInput() {

    if (!dataSourceNameInput.value.trim()) {

        return (
            "データソース名を入力してください。"
        );

    }

    const sourceType =
        sourceTypeSelect.value;

    if (!sourceType) {

        return (
            "データソース種別を選択してください。"
        );

    }

    if (
        sourceType === "url" ||
        sourceType === "api"
    ) {

        if (!endpointUrlInput.value.trim()) {

            return (
                "接続先URLを入力してください。"
            );

        }

        const authenticationMessage =
            validateAuthentication();

        if (authenticationMessage) {

            return authenticationMessage;

        }

    }

    return "";

}


function validateAuthentication() {

    const methodKey =
        normalizeAuthenticationMethodKey(
            authenticationMethodSelect.value
        );

    if (!methodKey) {

        return (
            "認証方式を選択してください。"
        );

    }

    if (methodKey === "basic") {

        if (!basicUsernameInput.value.trim()) {

            return (
                "ユーザーIDを入力してください。"
            );

        }

        if (
            !isEditMode &&
            !basicPasswordInput.value
        ) {

            return (
                "パスワードを入力してください。"
            );

        }

    }

    if (isClientCredentialsMethod(
        methodKey
    )) {

        if (!clientIdInput.value.trim()) {

            return (
                "クライアントIDを入力してください。"
            );

        }

        if (
            !isEditMode &&
            !clientSecretInput.value
        ) {

            return (
                "クライアントシークレットを入力してください。"
            );

        }

    }

    return "";

}


function createRequestBody() {

    const sourceType =
        sourceTypeSelect.value;

    const body = {
        data_source_name:
            dataSourceNameInput.value.trim(),

        source_type:
            sourceType,

        enabled:
            enabledInput.checked,

        parameters:
            parameters.map(
                (
                    parameter,
                    index
                ) => ({
                    parameter_id:
                        parameter.parameter_id ||
                        undefined,

                    parameter_type:
                        parameter.parameter_type,

                    parameter_name:
                        parameter.parameter_name,

                    parameter_value:
                        parameter.parameter_value,

                    display_order:
                        index + 1
                })
            )
    };

    if (sourceType === "file") {

        body.file_extensions =
            splitExtensions(
                fileExtensionsInput.value
            );

    }

    if (sourceType === "mail") {

        body.file_extensions =
            splitExtensions(
                mailExtensionsInput.value
            );

    }

    if (
        sourceType === "url" ||
        sourceType === "api"
    ) {

        body.endpoint_url =
            endpointUrlInput.value.trim();

        body.http_method =
            sourceType === "api"
                ? httpMethodSelect.value
                : "GET";

        Object.assign(
            body,
            createAuthenticationRequest()
        );

    }

    return body;

}


function createAuthenticationRequest() {

    const methodKey =
        normalizeAuthenticationMethodKey(
            authenticationMethodSelect.value
        );

    const authentication = {
        authentication_method_key:
            methodKey
    };

    if (methodKey === "basic") {

        authentication.username =
            basicUsernameInput.value.trim();

        if (basicPasswordInput.value) {

            authentication.password =
                basicPasswordInput.value;

        }

    }

    if (isClientCredentialsMethod(
        methodKey
    )) {

        authentication.client_id =
            clientIdInput.value.trim();

        if (clientSecretInput.value) {

            authentication.client_secret =
                clientSecretInput.value;

        }

        authentication.token_url =
            tokenUrlInput.value.trim();

        authentication.scope =
            scopeInput.value.trim();

    }

    return authentication;

}


async function handleSave() {

    const validationMessage =
        validateInput();

    if (validationMessage) {

        alert(
            validationMessage
        );

        return;

    }

    const body =
        createRequestBody();

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
                    method:
                        requestMethod,

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            body
                        )
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


function resetScreen() {

    dataSourceNameInput.value =
        "";

    sourceTypeSelect.value =
        "";

    fileExtensionsInput.value =
        "";

    mailExtensionsInput.value =
        ".eml";

    endpointUrlInput.value =
        "";

    httpMethodSelect.value =
        "GET";

    authenticationMethodSelect.value =
        "";

    basicUsernameInput.value =
        "";

    basicPasswordInput.value =
        "";

    clientIdInput.value =
        "";

    clientSecretInput.value =
        "";

    tokenUrlInput.value =
        "";

    scopeInput.value =
        "";

    enabledInput.checked =
        true;

    parameterTypeSelect.value =
        "query";

    parameterNameInput.value =
        "";

    parameterValueInput.value =
        "";

    parameters = [];

    hideSourceSettings();

    hideAuthenticationFields();

    renderParameters();

}


function normalizeSourceType(
    sourceType
) {

    return String(
        sourceType || ""
    )
        .trim()
        .toLowerCase();

}


function normalizeAuthenticationMethodKey(
    methodKey
) {

    return String(
        methodKey || ""
    )
        .trim()
        .toLowerCase()
        .replaceAll(
            "-",
            "_"
        );

}


function normalizeParameterType(
    parameterType
) {

    return String(
        parameterType || "query"
    )
        .trim()
        .toLowerCase();
}


function isClientCredentialsMethod(
    methodKey
) {

    return (
        methodKey === "credential" ||
        methodKey === "credentials" ||
        methodKey === "client_credentials"
    );

}


function getParameterTypeLabel(
    parameterType
) {

    const labels = {
        query:
            "検索条件",

        header:
            "HTTPヘッダー",

        body:
            "リクエスト本文",

        path:
            "パスパラメータ"
    };

    return (
        labels[parameterType] ||
        parameterType ||
        ""
    );

}


function splitExtensions(
    value
) {

    return String(
        value || ""
    )
        .split(
            ","
        )
        .map(
            extension =>
                extension.trim()
        )
        .filter(
            extension =>
                extension
        );

}


function formatExtensions(
    extensions
) {

    if (Array.isArray(
        extensions
    )) {

        return extensions.join(
            ", "
        );

    }

    return extensions || "";

}


function handleBack() {

    location.href =
        "./data_source_maintenance.html";

}