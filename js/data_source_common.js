export function normalizeFileExtension(value) {
    return String(value || "").trim().toLowerCase().replace(/^\.+/, "");
}

export function normalizeSourceType(value) {
    return String(value || "").trim().toLowerCase();
}

export function normalizeProcessingPattern(value) {
    const normalized = String(value || "raw")
        .trim()
        .toLowerCase()
        .replaceAll("-", "_");

    return [
        "raw",
        "json_list",
        "parent_child",
        "parent_child_grandchild",
        "file_links"
    ].includes(normalized)
        ? normalized
        : "raw";
}

export function normalizeAuthenticationMethodKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replaceAll("-", "_");
}

export function isClientCredentialsMethod(value) {
    return normalizeAuthenticationMethodKey(value) === "client_credentials";
}

export function formatExtensions(extensions) {
    return Array.isArray(extensions)
        ? extensions.join(", ")
        : extensions || "";
}

export function getSelectedFileExtensions(dom) {
    return Array.from(
        dom.fileExtensionList.querySelectorAll(
            'input[name="fileExtension"]:checked'
        )
    )
        .map(checkbox => normalizeFileExtension(checkbox.value))
        .filter(Boolean);
}

export function setSelectedFileExtensions(dom, extensions) {
    const selected = new Set(
        (Array.isArray(extensions) ? extensions : [])
            .map(normalizeFileExtension)
            .filter(Boolean)
    );

    dom.fileExtensionList
        .querySelectorAll('input[name="fileExtension"]')
        .forEach(checkbox => {
            checkbox.checked = selected.has(
                normalizeFileExtension(checkbox.value)
            );
        });
}

export function clearSelectedFileExtensions(dom) {
    setSelectedFileExtensions(dom, []);
}

export function renderFileExtensionList(dom, availableFileTypes) {
    dom.fileExtensionList.innerHTML = "";

    if (!availableFileTypes.length) {
        const message = document.createElement("div");
        message.textContent = "有効な拡張子が登録されていません。";
        dom.fileExtensionList.appendChild(message);
        return;
    }

    availableFileTypes.forEach(fileType => {
        const label = document.createElement("label");
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "6px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "fileExtension";
        checkbox.value = fileType.extension;

        const text = document.createElement("span");
        text.textContent = `.${fileType.extension}`;

        label.appendChild(checkbox);
        label.appendChild(text);
        dom.fileExtensionList.appendChild(label);
    });
}
