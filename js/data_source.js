import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const sourceTypeSelect =
    document.getElementById(
        "sourceTypeSelect"
    );

const authenticationArea =
    document.getElementById(
        "authenticationArea"
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

const tokenUrlInput =
    document.getElementById(
        "tokenUrl"
    );

const clientIdInput =
    document.getElementById(
        "clientId"
    );

const clientSecretInput =
    document.getElementById(
        "clientSecret"
    );

const scopeInput =
    document.getElementById(
        "scope"
    );

const panelEmpty =
    document.getElementById(
        "panelEmpty"
    );

const panelUpload =
    document.getElementById(
        "panelUpload"
    );

const panelMail =
    document.getElementById(
        "panelMail"
    );

const panelUrl =
    document.getElementById(
        "panelUrl"
    );

const panelApi =
    document.getElementById(
        "panelApi"
    );

const uploadFileInput =
    document.getElementById(
        "uploadFileInput"
    );

const uploadFileName =
    document.getElementById(
        "uploadFileName"
    );

const mailFileInput =
    document.getElementById(
        "mailFileInput"
    );

const mailFileName =
    document.getElementById(
        "mailFileName"
    );

const btnUploadRegister =
    document.getElementById(
        "btnUploadRegister"
    );

const btnMailRegister =
    document.getElementById(
        "btnMailRegister"
    );

const btnUrlRegister =
    document.getElementById(
        "btnUrlRegister"
    );

const btnApiRegister =
    document.getElementById(
        "btnApiRegister"
    );

const btnClearLog =
    document.getElementById(
        "btnClearLog"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const logText =
    document.getElementById(
        "logText"
    );


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await waitForLogin();

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/session`,
            {
                method: "POST"
            }
        );

        sourceTypeSelect.addEventListener(
            "change",
            handleSourceTypeChanged
        );

        authenticationMethodSelect.addEventListener(
            "change",
            handleAuthenticationMethodChanged
        );

        uploadFileInput.addEventListener(
            "change",
            handleUploadFileChanged
        );

        mailFileInput.addEventListener(
            "change",
            handleMailFileChanged
        );

        btnUploadRegister.addEventListener(
            "click",
            handleUpload
        );

        btnMailRegister.addEventListener(
            "click",
            handleMailUpload
        );

        btnUrlRegister.addEventListener(
            "click",
            handleUrlRegister
        );

        btnApiRegister.addEventListener(
            "click",
            handleApiRegister
        );

        btnClearLog.addEventListener(
            "click",
            clearLog
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadAuthenticationMethods();

        resetScreen();

    } catch (error) {

        console.error(
            "データ取り込み画面初期化エラー:",
            error
        );

        alert(
            error.message ||
            "画面の初期化に失敗しました。"
        );

        location.href =
            "./index.html";

    }

}


async function loadAuthenticationMethods() {

    const result =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/authentication-methods`,
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
            method => method.enabled
        )
        .forEach(
            method => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    method.method_key || "";

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


function handleSourceTypeChanged() {

    hideAllSourcePanels();

    resetAuthenticationFields();

    const sourceType =
        sourceTypeSelect.value;

    if (!sourceType) {

        panelEmpty.classList.remove(
            "hidden"
        );

        return;

    }

    if (sourceType === "file") {

        panelUpload.classList.remove(
            "hidden"
        );

        return;

    }

    if (sourceType === "mail") {

        panelMail.classList.remove(
            "hidden"
        );

        return;

    }

    authenticationArea.classList.remove(
        "hidden"
    );

    if (sourceType === "url") {

        panelUrl.classList.remove(
            "hidden"
        );

        return;

    }

    if (sourceType === "api") {

        panelApi.classList.remove(
            "hidden"
        );

    }

}


function handleAuthenticationMethodChanged() {

    hideAuthenticationFields();

    const methodKey =
        authenticationMethodSelect.value;

    if (
        methodKey === "basic"
    ) {

        basicAuthenticationFields.classList.remove(
            "hidden"
        );

        return;

    }

    if (
        methodKey === "client_credentials"
    ) {

        clientCredentialsFields.classList.remove(
            "hidden"
        );

    }

}


function hideAllSourcePanels() {

    panelEmpty.classList.add(
        "hidden"
    );

    panelUpload.classList.add(
        "hidden"
    );

    panelMail.classList.add(
        "hidden"
    );

    panelUrl.classList.add(
        "hidden"
    );

    panelApi.classList.add(
        "hidden"
    );

    authenticationArea.classList.add(
        "hidden"
    );

}


function hideAuthenticationFields() {

    basicAuthenticationFields.classList.add(
        "hidden"
    );

    clientCredentialsFields.classList.add(
        "hidden"
    );

}


function resetAuthenticationFields() {

    authenticationMethodSelect.value =
        "";

    basicUsernameInput.value =
        "";

    basicPasswordInput.value =
        "";

    tokenUrlInput.value =
        "";

    clientIdInput.value =
        "";

    clientSecretInput.value =
        "";

    scopeInput.value =
        "";

    hideAuthenticationFields();

}


function resetScreen() {

    sourceTypeSelect.value =
        "";

    hideAllSourcePanels();

    panelEmpty.classList.remove(
        "hidden"
    );

    resetAuthenticationFields();

}


function handleUploadFileChanged() {

    const file =
        uploadFileInput.files?.[0];

    setFileName(
        uploadFileName,
        file?.name
    );

}


function handleMailFileChanged() {

    const file =
        mailFileInput.files?.[0];

    setFileName(
        mailFileName,
        file?.name
    );

}


function setFileName(
    element,
    fileName
) {

    if (!fileName) {

        element.textContent =
            "ファイルが選択されていません";

        element.classList.add(
            "is-empty"
        );

        return;

    }

    element.textContent =
        fileName;

    element.classList.remove(
        "is-empty"
    );

}


function createAuthenticationRequest() {

    const methodKey =
        authenticationMethodSelect.value;

    const authentication = {
        method_key:
            methodKey
    };

    if (
        methodKey === "basic"
    ) {

        authentication.username =
            basicUsernameInput.value.trim();

        authentication.password =
            basicPasswordInput.value;

    }

    if (
        methodKey === "client_credentials"
    ) {

        authentication.token_url =
            tokenUrlInput.value.trim();

        authentication.client_id =
            clientIdInput.value.trim();

        authentication.client_secret =
            clientSecretInput.value;

        authentication.scope =
            scopeInput.value.trim();

    }

    return authentication;

}


function validateAuthentication() {

    const methodKey =
        authenticationMethodSelect.value;

    if (!methodKey) {

        return (
            "認証方式を選択してください。"
        );

    }

    if (
        methodKey === "basic"
    ) {

        if (
            !basicUsernameInput.value.trim()
        ) {

            return (
                "ユーザー名を入力してください。"
            );

        }

        if (
            !basicPasswordInput.value
        ) {

            return (
                "パスワードを入力してください。"
            );

        }

    }

    if (
        methodKey === "client_credentials"
    ) {

        if (
            !tokenUrlInput.value.trim()
        ) {

            return (
                "トークンURLを入力してください。"
            );

        }

        if (
            !clientIdInput.value.trim()
        ) {

            return (
                "クライアントIDを入力してください。"
            );

        }

        if (
            !clientSecretInput.value
        ) {

            return (
                "クライアントシークレットを入力してください。"
            );

        }

    }

    return "";

}


async function handleUpload() {

    const file =
        uploadFileInput.files?.[0];

    if (!file) {

        alert(
            "ファイルを選択してください。"
        );

        return;

    }

    writeLog(
        `ファイルアップロード準備: ${file.name}`
    );

    alert(
        "ファイルアップロードAPIは次に実装します。"
    );

}


async function handleMailUpload() {

    const file =
        mailFileInput.files?.[0];

    if (!file) {

        alert(
            "メールファイルを選択してください。"
        );

        return;

    }

    writeLog(
        `メール取り込み準備: ${file.name}`
    );

    alert(
        "メール取り込みAPIは次に実装します。"
    );

}


async function handleUrlRegister() {

    const validationMessage =
        validateAuthentication();

    if (validationMessage) {

        alert(
            validationMessage
        );

        return;

    }

    const publicUrl =
        document.getElementById(
            "publicUrl"
        ).value.trim();

    if (!publicUrl) {

        alert(
            "取得対象URLを入力してください。"
        );

        return;

    }

    const body = {
        source_type:
            "url",

        target_url:
            publicUrl,

        authentication:
            createAuthenticationRequest()
    };

    console.log(
        "URL取得設定:",
        body
    );

    writeLog(
        `公開URL取得準備: ${publicUrl}`
    );

    alert(
        "公開URL取得APIは次に実装します。"
    );

}


async function handleApiRegister() {

    const validationMessage =
        validateAuthentication();

    if (validationMessage) {

        alert(
            validationMessage
        );

        return;

    }

    const apiUrl =
        document.getElementById(
            "apiUrl"
        ).value.trim();

    if (!apiUrl) {

        alert(
            "API URLを入力してください。"
        );

        return;

    }

    let requestParameters = {};

    const requestParametersText =
        document.getElementById(
            "requestParameters"
        ).value.trim();

    if (requestParametersText) {

        try {

            requestParameters =
                JSON.parse(
                    requestParametersText
                );

        } catch {

            alert(
                "検索条件はJSON形式で入力してください。"
            );

            return;

        }

    }

    const body = {
        source_type:
            "api",

        endpoint_url:
            apiUrl,

        http_method:
            document.getElementById(
                "httpMethod"
            ).value,

        request_parameters:
            requestParameters,

        authentication:
            createAuthenticationRequest()
    };

    console.log(
        "API取得設定:",
        body
    );

    writeLog(
        `公開API取得準備: ${apiUrl}`
    );

    alert(
        "公開API取得APIは次に実装します。"
    );

}


function writeLog(
    message
) {

    const now =
        new Date();

    const time =
        now.toLocaleTimeString(
            "ja-JP",
            {
                hour12: false
            }
        );

    logText.textContent +=
        `[${time}] ${message}\n`;

    logText.scrollTop =
        logText.scrollHeight;

}


function clearLog() {

    logText.textContent =
        "";

}


function handleBack() {

    location.href =
        "./menu.html";

}