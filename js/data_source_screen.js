import {
    clearSelectedFileExtensions,
    formatExtensions,
    normalizeAuthenticationMethodKey,
    normalizeProcessingPattern,
    normalizeSourceType,
    setSelectedFileExtensions,
    isClientCredentialsMethod
} from "./data_source_common.js";

export function handleProcessingPatternChanged(dom, clearInactive = true) {
    const pattern = normalizeProcessingPattern(
        dom.processingPatternSelect.value
    );

    dom.processingPatternSettings.classList.add("hidden");
    dom.jsonListSettings.classList.add("hidden");
    dom.parentChildSettings.classList.add("hidden");
    dom.parentChildGrandchildSettings.classList.add("hidden");
    dom.fileLinkSettings.classList.add("hidden");

    if (dom.parentDisplaySettings) {
        dom.parentDisplaySettings.classList.add("hidden");
    }

    if (clearInactive) {
        if (pattern !== "json_list") {
            dom.listArrayPathInput.value = "";
        }

        if (pattern !== "parent_child") {
            dom.parentArrayPathInput.value = "";
            dom.childArrayPathInput.value = "";
        }

        if (pattern !== "parent_child_grandchild") {
            dom.grandParentArrayPathInput.value = "";
            dom.grandChildArrayPathInput.value = "";
            dom.grandchildArrayPathInput.value = "";
        }

        if (pattern !== "file_links") {
            dom.fileLinkArrayPathInput.value = "";
            dom.fileLinkFieldNameInput.value = "";
        }
    }

    if (pattern === "raw") {
        return;
    }

    dom.processingPatternSettings.classList.remove("hidden");

    if (pattern === "json_list") {
        dom.jsonListSettings.classList.remove("hidden");
    } else if (pattern === "parent_child") {
        dom.parentChildSettings.classList.remove("hidden");
    } else if (pattern === "parent_child_grandchild") {
        dom.parentChildGrandchildSettings.classList.remove("hidden");
    } else if (pattern === "file_links") {
        dom.fileLinkSettings.classList.remove("hidden");
    }

    if (
        dom.parentDisplaySettings &&
        (
            pattern === "parent_child" ||
            pattern === "parent_child_grandchild"
        )
    ) {
        dom.parentDisplaySettings.classList.remove("hidden");
    }
}

export function hideSourceSettings(dom) {
    dom.fileSettings.classList.add("hidden");
    dom.mailSettings.classList.add("hidden");
    dom.connectionSettings.classList.add("hidden");
    dom.httpMethodRow.classList.add("hidden");
}

export function hideAuthenticationFields(dom) {
    dom.basicAuthenticationFields.classList.add("hidden");
    dom.clientCredentialsFields.classList.add("hidden");
}

export function handleSourceTypeChanged(dom) {
    const sourceType = normalizeSourceType(dom.sourceTypeSelect.value);
    const methodKey = normalizeAuthenticationMethodKey(
        dom.authenticationMethodSelect.value
    );

    const isExternal = sourceType === "api" || sourceType === "url";

    dom.httpMethodRow.classList.toggle(
        "hidden",
        !isExternal ||
        sourceType !== "api" ||
        methodKey === "file_upload"
    );

    const showFileExtensions =
        methodKey === "file_upload" ||
        sourceType === "file";

    dom.fileSettings.classList.toggle(
        "hidden",
        !showFileExtensions
    );
}

export function handleAuthenticationMethodChanged(dom) {
    hideSourceSettings(dom);
    hideAuthenticationFields(dom);

    const methodKey = normalizeAuthenticationMethodKey(
        dom.authenticationMethodSelect.value
    );

    if (!methodKey) {
        return;
    }

    if (methodKey === "file_upload") {
        dom.fileSettings.classList.remove("hidden");
        return;
    }

    dom.connectionSettings.classList.remove("hidden");

    if (methodKey === "basic") {
        dom.basicAuthenticationFields.classList.remove("hidden");
    }

    if (isClientCredentialsMethod(methodKey)) {
        dom.clientCredentialsFields.classList.remove("hidden");
    }

    handleSourceTypeChanged(dom);
}

export function setDataSourceValues(dom, state, dataSource) {
    dom.tenantSelect.value = dataSource.tenant_id || "";
    dom.dataSourceNameInput.value =
        dataSource.data_source_name ||
        dataSource.name ||
        "";

    dom.sourceTypeSelect.value = normalizeSourceType(
        dataSource.source_type
    );

    dom.processingPatternSelect.value = normalizeProcessingPattern(
        dataSource.processing_pattern
    );

    dom.listArrayPathInput.value =
        dataSource.list_array_path || "";

    dom.parentArrayPathInput.value =
        dataSource.parent_array_path || "";

    dom.childArrayPathInput.value =
        dataSource.child_array_path || "";

    dom.grandParentArrayPathInput.value =
        dataSource.parent_array_path || "";

    dom.grandChildArrayPathInput.value =
        dataSource.child_array_path || "";

    dom.grandchildArrayPathInput.value =
        dataSource.grandchild_array_path || "";

    dom.fileLinkArrayPathInput.value =
        dataSource.file_link_array_path || "";

    dom.fileLinkFieldNameInput.value =
        dataSource.file_link_field_name || "";

    setSelectedFileExtensions(
        dom,
        dataSource.file_extensions
    );

    dom.mailExtensionsInput.value =
        formatExtensions(dataSource.file_extensions) || ".eml";

    dom.endpointUrlInput.value =
        dataSource.endpoint_url ||
        dataSource.target_url ||
        "";

    dom.httpMethodSelect.value =
        dataSource.http_method || "GET";

    dom.authenticationMethodSelect.value =
        normalizeAuthenticationMethodKey(
            dataSource.authentication_method_key ||
            dataSource.method_key
        );

    dom.basicUsernameInput.value =
        dataSource.username ||
        dataSource.user_id ||
        "";

    dom.basicPasswordInput.value = "";
    dom.clientIdInput.value = dataSource.client_id || "";
    dom.clientSecretInput.value = "";
    dom.tokenUrlInput.value = dataSource.token_url || "";
    dom.scopeInput.value = dataSource.scope || "";
    dom.enabledInput.checked = dataSource.enabled !== false;

    state.parentDisplayFields = Array.isArray(
        dataSource.parent_display_fields
    )
        ? dataSource.parent_display_fields.map(
            (field, index) => ({
                field_id:
                    field.field_id ||
                    field.id ||
                    "",
                label:
                    field.label ||
                    field.display_name ||
                    "",
                path:
                    field.path ||
                    field.field_path ||
                    "",
                display_order:
                    field.display_order ||
                    index + 1
            })
        )
        : [];

    state.parameters = Array.isArray(dataSource.parameters)
        ? dataSource.parameters.map((parameter, index) => ({
            parameter_id:
                parameter.parameter_id ||
                parameter.id ||
                "",
            parameter_name:
                parameter.parameter_name || "",
            parameter_value:
                parameter.parameter_value ?? "",
            display_order:
                parameter.display_order || index + 1
        }))
        : [];

    handleProcessingPatternChanged(dom, false);
    handleSourceTypeChanged(dom);
    handleAuthenticationMethodChanged(dom);
}

export function resetScreen(dom, state) {
    dom.tenantSelect.value = "";
    dom.dataSourceNameInput.value = "";
    dom.sourceTypeSelect.value = "";
    dom.processingPatternSelect.value = "raw";

    dom.listArrayPathInput.value = "";
    dom.parentArrayPathInput.value = "";
    dom.childArrayPathInput.value = "";
    dom.grandParentArrayPathInput.value = "";
    dom.grandChildArrayPathInput.value = "";
    dom.grandchildArrayPathInput.value = "";
    dom.fileLinkArrayPathInput.value = "";
    dom.fileLinkFieldNameInput.value = "";

    clearSelectedFileExtensions(dom);

    dom.mailExtensionsInput.value = ".eml";
    dom.endpointUrlInput.value = "";
    dom.httpMethodSelect.value = "GET";
    dom.authenticationMethodSelect.value = "";
    dom.basicUsernameInput.value = "";
    dom.basicPasswordInput.value = "";
    dom.clientIdInput.value = "";
    dom.clientSecretInput.value = "";
    dom.tokenUrlInput.value = "";
    dom.scopeInput.value = "";
    dom.enabledInput.checked = true;
    dom.parameterNameInput.value = "";
    dom.parameterValueInput.value = "";

    state.parameters = [];
    state.parentDisplayFields = [];
    state.legacyDataFormat = "";

    handleProcessingPatternChanged(dom, false);
    hideSourceSettings(dom);
    hideAuthenticationFields(dom);
}
