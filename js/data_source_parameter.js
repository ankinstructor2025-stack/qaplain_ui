export function handleAddParameter(dom, state) {
    const parameterName =
        dom.parameterNameInput.value.trim();

    const parameterValue =
        dom.parameterValueInput.value;

    if (!parameterName) {
        alert("項目名を入力してください。");
        return;
    }

    const duplicated = state.parameters.some(
        parameter =>
            String(parameter.parameter_name || "")
                .trim()
                .toLowerCase() ===
            parameterName.toLowerCase()
    );

    if (duplicated) {
        alert("同じ項目名が登録されています。");
        return;
    }

    state.parameters.push({
        parameter_id: "",
        parameter_name: parameterName,
        parameter_value: parameterValue,
        display_order: state.parameters.length + 1
    });

    dom.parameterNameInput.value = "";
    dom.parameterValueInput.value = "";

    renderParameters(dom, state);
}

export function renderParameters(dom, state) {
    dom.parameterList.innerHTML = "";

    if (!state.parameters.length) {
        showParameterMessage(
            dom,
            "項目は登録されていません。"
        );
        return;
    }

    state.parameters.forEach((parameter, index) => {
        const row = document.createElement("div");
        row.className = "list-row";

        row.appendChild(
            createTextColumn(
                parameter.parameter_name,
                "45%"
            )
        );

        row.appendChild(
            createTextColumn(
                parameter.parameter_value,
                "45%"
            )
        );

        row.appendChild(
            createParameterActionColumn(
                dom,
                state,
                index
            )
        );

        dom.parameterList.appendChild(row);
    });
}

function createTextColumn(text, width) {
    const column = document.createElement("div");
    column.style.width = width;
    column.textContent = text ?? "";
    return column;
}

function createParameterActionColumn(dom, state, index) {
    const column = document.createElement("div");
    column.style.width = "10%";
    column.className = "list-actions";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-small btn-danger";
    deleteButton.textContent = "削除";

    deleteButton.addEventListener(
        "click",
        () => deleteParameter(
            dom,
            state,
            index
        )
    );

    column.appendChild(deleteButton);
    return column;
}

function deleteParameter(dom, state, index) {
    state.parameters.splice(index, 1);

    state.parameters = state.parameters.map(
        (parameter, parameterIndex) => ({
            ...parameter,
            display_order: parameterIndex + 1
        })
    );

    renderParameters(dom, state);
}

function showParameterMessage(dom, message) {
    const row = document.createElement("div");
    row.className = "list-row";

    const column = document.createElement("div");
    column.style.width = "100%";
    column.textContent = message;

    row.appendChild(column);
    dom.parameterList.appendChild(row);
}
