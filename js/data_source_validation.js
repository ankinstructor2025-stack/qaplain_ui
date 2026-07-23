import {
    getSelectedFileExtensions,
    isClientCredentialsMethod,
    normalizeAuthenticationMethodKey,
    normalizeProcessingPattern
} from "./data_source_common.js";

export function validateInput(dom, isEditMode) {
    if (!dom.tenantSelect.value.trim()) {
        return "テナントを選択してください。";
    }

    if (!dom.dataSourceNameInput.value.trim()) {
        return "データソース名を入力してください。";
    }

    if (!dom.sourceTypeSelect.value.trim()) {
        return "データソース種別を選択してください。";
    }

    const sourceType = String(dom.sourceTypeSelect.value || "")
        .trim()
        .toLowerCase();

    // ファイルは認証方式・処理方式・追加項目を使用しない。
    if (sourceType === "file" || sourceType === "mail") {
        if (!getSelectedFileExtensions(dom).length) {
            return "対象拡張子を1つ以上選択してください。";
        }
        return "";
    }

    if (!dom.processingPatternSelect.value.trim()) {
        return "処理方式を選択してください。";
    }

    const methodKey = normalizeAuthenticationMethodKey(
        dom.authenticationMethodSelect.value
    );

    if (!methodKey) {
        return "認証方式を選択してください。";
    }

    if (!dom.endpointUrlInput.value.trim()) {
        return "接続先URLを入力してください。";
    }

    const pattern = normalizeProcessingPattern(
        dom.processingPatternSelect.value
    );

    if (
        pattern === "json_list" &&
        !dom.listArrayPathInput.value.trim()
    ) {
        return "一覧配列を入力してください。";
    }

    if (pattern === "parent_child") {
        if (!dom.parentArrayPathInput.value.trim()) {
            return "親配列を入力してください。";
        }
        if (!dom.childArrayPathInput.value.trim()) {
            return "子配列を入力してください。";
        }
    }

    if (pattern === "parent_child_grandchild") {
        if (!dom.grandParentArrayPathInput.value.trim()) {
            return "親配列を入力してください。";
        }
        if (!dom.grandChildArrayPathInput.value.trim()) {
            return "子配列を入力してください。";
        }
        if (!dom.grandchildArrayPathInput.value.trim()) {
            return "孫配列を入力してください。";
        }
    }

    if (pattern === "file_links") {
        if (!dom.fileLinkArrayPathInput.value.trim()) {
            return "一覧配列を入力してください。";
        }
        if (!dom.fileLinkFieldNameInput.value.trim()) {
            return "ファイルURL項目を入力してください。";
        }
        if (!getSelectedFileExtensions(dom).length) {
            return "対象拡張子を1つ以上選択してください。";
        }
    }

    return validateAuthentication(
        dom,
        isEditMode
    );
}

function validateAuthentication(dom, isEditMode) {
    const methodKey = normalizeAuthenticationMethodKey(
        dom.authenticationMethodSelect.value
    );

    if (
        methodKey === "none" ||
        methodKey === "file_upload"
    ) {
        return "";
    }

    if (methodKey === "basic") {
        if (!dom.basicUsernameInput.value.trim()) {
            return "ユーザーIDを入力してください。";
        }

        if (
            !isEditMode &&
            !dom.basicPasswordInput.value
        ) {
            return "パスワードを入力してください。";
        }

        return "";
    }

    if (isClientCredentialsMethod(methodKey)) {
        if (!dom.clientIdInput.value.trim()) {
            return "クライアントIDを入力してください。";
        }

        if (
            !isEditMode &&
            !dom.clientSecretInput.value
        ) {
            return "クライアントシークレットを入力してください。";
        }

        if (!dom.tokenUrlInput.value.trim()) {
            return "トークンURLを入力してください。";
        }

        return "";
    }

    return "未対応の認証方式です。";
}
