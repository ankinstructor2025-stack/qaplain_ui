export function createParentDisplayFieldUi(dom) {
    if (document.getElementById("parentDisplaySettings")) {
        bindParentDisplayFieldDom(dom);
        return;
    }

    const settings = document.createElement("div");
    settings.id = "parentDisplaySettings";
    settings.className = "hidden";
    settings.style.marginTop = "18px";

    const title = document.createElement("div");
    title.textContent = "親情報表示項目";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";

    const description = document.createElement("div");
    description.textContent =
        "データ照会の親情報欄に表示する項目を設定します。";
    description.style.fontSize = "12px";
    description.style.marginBottom = "10px";

    const inputRow = document.createElement("div");
    inputRow.style.display = "grid";
    inputRow.style.gridTemplateColumns = "minmax(180px, 1fr) minmax(220px, 1.5fr) auto";
    inputRow.style.gap = "8px";
    inputRow.style.alignItems = "end";
    inputRow.style.marginBottom = "10px";

    const labelGroup = createInputGroup(
        "表示名",
        "parentDisplayLabel",
        "例：会議名"
    );

    const pathGroup = createInputGroup(
        "JSON項目パス",
        "parentDisplayPath",
        "例：nameOfMeeting"
    );

    const addButton = document.createElement("button");
    addButton.id = "addParentDisplayFieldButton";
    addButton.type = "button";
    addButton.className = "btn btn-small";
    addButton.textContent = "追加";
    addButton.style.minWidth = "76px";

    inputRow.appendChild(labelGroup.container);
    inputRow.appendChild(pathGroup.container);
    inputRow.appendChild(addButton);

    const header = document.createElement("div");
    header.className = "list-header";
    header.style.display = "grid";
    header.style.gridTemplateColumns = "35% 55% 10%";
    header.style.padding = "8px 10px";

    header.appendChild(createHeaderColumn("表示名"));
    header.appendChild(createHeaderColumn("JSON項目パス"));
    header.appendChild(createHeaderColumn("操作"));

    const list = document.createElement("div");
    list.id = "parentDisplayFieldList";
    list.className = "list-body";

    settings.appendChild(title);
    settings.appendChild(description);
    settings.appendChild(inputRow);
    settings.appendChild(header);
    settings.appendChild(list);

    dom.processingPatternSettings.appendChild(settings);

    bindParentDisplayFieldDom(dom);
}

export function handleAddParentDisplayField(dom, state) {
    const label = dom.parentDisplayLabelInput.value.trim();
    const path = dom.parentDisplayPathInput.value.trim();

    if (!label) {
        alert("表示名を入力してください。");
        return;
    }

    if (!path) {
        alert("JSON項目パスを入力してください。");
        return;
    }

    const duplicated = state.parentDisplayFields.some(
        field =>
            String(field.path || "")
                .trim()
                .toLowerCase() === path.toLowerCase()
    );

    if (duplicated) {
        alert("同じJSON項目パスが登録されています。");
        return;
    }

    state.parentDisplayFields.push({
        field_id: "",
        label,
        path,
        display_order: state.parentDisplayFields.length + 1
    });

    dom.parentDisplayLabelInput.value = "";
    dom.parentDisplayPathInput.value = "";

    renderParentDisplayFields(dom, state);
}

export function renderParentDisplayFields(dom, state) {
    dom.parentDisplayFieldList.innerHTML = "";

    if (!state.parentDisplayFields.length) {
        const row = document.createElement("div");
        row.className = "list-row";
        row.style.padding = "10px";
        row.textContent = "表示項目は登録されていません。";
        dom.parentDisplayFieldList.appendChild(row);
        return;
    }

    state.parentDisplayFields.forEach((field, index) => {
        const row = document.createElement("div");
        row.className = "list-row";
        row.style.display = "grid";
        row.style.gridTemplateColumns = "35% 55% 10%";
        row.style.alignItems = "center";
        row.style.padding = "8px 10px";

        row.appendChild(createTextColumn(field.label));
        row.appendChild(createTextColumn(field.path));
        row.appendChild(
            createActionColumn(dom, state, index)
        );

        dom.parentDisplayFieldList.appendChild(row);
    });
}

export function clearParentDisplayFields(dom, state) {
    state.parentDisplayFields = [];
    dom.parentDisplayLabelInput.value = "";
    dom.parentDisplayPathInput.value = "";
    renderParentDisplayFields(dom, state);
}

function bindParentDisplayFieldDom(dom) {
    dom.parentDisplaySettings =
        document.getElementById("parentDisplaySettings");
    dom.parentDisplayLabelInput =
        document.getElementById("parentDisplayLabel");
    dom.parentDisplayPathInput =
        document.getElementById("parentDisplayPath");
    dom.parentDisplayFieldList =
        document.getElementById("parentDisplayFieldList");
    dom.addParentDisplayFieldButton =
        document.getElementById("addParentDisplayFieldButton");
}

function createInputGroup(labelText, inputId, placeholder) {
    const container = document.createElement("div");

    const label = document.createElement("label");
    label.htmlFor = inputId;
    label.textContent = labelText;
    label.style.display = "block";
    label.style.marginBottom = "4px";

    const input = document.createElement("input");
    input.id = inputId;
    input.type = "text";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.style.width = "100%";

    container.appendChild(label);
    container.appendChild(input);

    return { container, input };
}

function createHeaderColumn(text) {
    const column = document.createElement("div");
    column.textContent = text;
    return column;
}

function createTextColumn(text) {
    const column = document.createElement("div");
    column.textContent = text || "";
    column.style.overflowWrap = "anywhere";
    return column;
}

function createActionColumn(dom, state, index) {
    const column = document.createElement("div");
    column.className = "list-actions";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-small btn-danger";
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", () => {
        state.parentDisplayFields.splice(index, 1);
        state.parentDisplayFields =
            state.parentDisplayFields.map(
                (field, fieldIndex) => ({
                    ...field,
                    display_order: fieldIndex + 1
                })
            );

        renderParentDisplayFields(dom, state);
    });

    column.appendChild(deleteButton);
    return column;
}
