import {
    getSelectedFileExtensions,
    isClientCredentialsMethod,
    normalizeAuthenticationMethodKey,
    normalizeProcessingPattern
} from "./data_source_common.js";

export function createRequestBody(dom, state) {
    const methodKey = normalizeAuthenticationMethodKey(
        dom.authenticationMethodSelect.value
    );

    const body = {
        tenant_id: dom.tenantSelect.value,
        data_source_name:
            dom.dataSourceNameInput.value.trim(),
        source_type:
            dom.sourceTypeSelect.value,
        processing_pattern:
            normalizeProcessingPattern(
                dom.processingPatternSelect.value
            ),
        authentication_method_key:
            methodKey,
        enabled:
            dom.enabledInput.checked,
        parameters:
            state.parameters.map(
                (parameter, index) => ({
                    parameter_id:
                        parameter.parameter_id ||
                        undefined,
                    parameter_name:
                        parameter.parameter_name,
                    parameter_value:
                        parameter.parameter_value,
                    display_order:
                        index + 1
                })
            )
    };

    if (methodKey === "file_upload") {
        body.processing_pattern = "raw";
        body.data_format = "file";
        body.file_extensions =
            getSelectedFileExtensions(dom);
        return body;
    }

    body.data_format =
        state.legacyDataFormat || "json";

    body.file_extensions = [];
    body.endpoint_url =
        dom.endpointUrlInput.value.trim();

    body.http_method =
        dom.sourceTypeSelect.value === "api"
            ? dom.httpMethodSelect.value
            : "GET";

    Object.assign(
        body,
        createAuthenticationRequest(dom)
    );

    const pattern = body.processing_pattern;

    if (pattern === "json_list") {
        body.list_array_path =
            dom.listArrayPathInput.value.trim();
    } else if (pattern === "parent_child") {
        body.parent_array_path =
            dom.parentArrayPathInput.value.trim();
        body.child_array_path =
            dom.childArrayPathInput.value.trim();
    } else if (
        pattern ===
        "parent_child_grandchild"
    ) {
        body.parent_array_path =
            dom.grandParentArrayPathInput.value.trim();
        body.child_array_path =
            dom.grandChildArrayPathInput.value.trim();
        body.grandchild_array_path =
            dom.grandchildArrayPathInput.value.trim();
    } else if (pattern === "file_links") {
        body.file_link_array_path =
            dom.fileLinkArrayPathInput.value.trim();
        body.file_link_field_name =
            dom.fileLinkFieldNameInput.value.trim();
    }

    return body;
}

function createAuthenticationRequest(dom) {
    const methodKey =
        normalizeAuthenticationMethodKey(
            dom.authenticationMethodSelect.value
        );

    const authentication = {};

    if (methodKey === "basic") {
        authentication.username =
            dom.basicUsernameInput.value.trim();

        if (dom.basicPasswordInput.value) {
            authentication.password =
                dom.basicPasswordInput.value;
        }

        return authentication;
    }

    if (isClientCredentialsMethod(methodKey)) {
        authentication.client_id =
            dom.clientIdInput.value.trim();

        if (dom.clientSecretInput.value) {
            authentication.client_secret =
                dom.clientSecretInput.value;
        }

        authentication.token_url =
            dom.tokenUrlInput.value.trim();

        authentication.scope =
            dom.scopeInput.value.trim();
    }

    return authentication;
}
