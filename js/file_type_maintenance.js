import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const fileTypeList =
    document.getElementById(
        "fileTypeList"
    );

const addFileTypeButton =
    document.getElementById(
        "addFileTypeButton"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


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

        if (
            !session.is_system_administrator
        ) {

            alert(
                "システム管理者権限がありません。"
            );

            location.href =
                "./menu.html";

            return;

        }

        addFileTypeButton.addEventListener(
            "click",
            handleAddFileType
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadFileTypes();

    } catch (error) {

        console.error(
            "拡張子管理画面初期化エラー:",
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


async function loadFileTypes() {

    showListMessage(
        "読み込み中..."
    );

    try {

        const result =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/file-types`,
                {
                    method: "GET"
                }
            );

        const fileTypes =
            Array.isArray(result)
                ? result
                : result.file_types || [];

        renderFileTypes(
            fileTypes
        );

    } catch (error) {

        console.error(
            "拡張子一覧取得エラー:",
            error
        );

        showListMessage(
            error.message ||
            "拡張子一覧を取得できませんでした。"
        );

    }

}


function renderFileTypes(
    fileTypes
) {

    fileTypeList.innerHTML =
        "";

    if (fileTypes.length === 0) {

        showListMessage(
            "拡張子が登録されていません。"
        );

        return;

    }

    fileTypes.forEach(
        fileType => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "list-row";

            row.appendChild(
                createColumn(
                    formatExtension(
                        fileType.extension
                    ),
                    "40%"
                )
            );

            row.appendChild(
                createColumn(
                    fileType.enabled
                        ? "有効"
                        : "無効",
                    "30%"
                )
            );

            row.appendChild(
                createActionColumn(
                    fileType
                )
            );

            fileTypeList.appendChild(
                row
            );

        }
    );

}


function createColumn(
    value,
    width
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        width;

    column.textContent =
        value;

    return column;

}


function createActionColumn(
    fileType
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "30%";

    column.className =
        "list-row-actions";


    const editButton =
        document.createElement(
            "button"
        );

    editButton.type =
        "button";

    editButton.className =
        "btn";

    editButton.textContent =
        "編集";

    editButton.addEventListener(
        "click",
        () => {
            handleEditFileType(
                fileType
            );
        }
    );


    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "btn";

    deleteButton.textContent =
        "削除";

    deleteButton.addEventListener(
        "click",
        () => {
            handleDeleteFileType(
                fileType
            );
        }
    );


    column.appendChild(
        editButton
    );

    column.appendChild(
        deleteButton
    );

    return column;

}


function handleAddFileType() {

    location.href =
        "./file_type_edit.html";

}


function handleEditFileType(
    fileType
) {

    const extension =
        normalizeExtension(
            fileType.extension
        );

    if (!extension) {

        alert(
            "拡張子を取得できません。"
        );

        return;

    }

    location.href =
        `./file_type_edit.html?extension=${
            encodeURIComponent(
                extension
            )
        }`;

}


async function handleDeleteFileType(
    fileType
) {

    const extension =
        normalizeExtension(
            fileType.extension
        );

    if (!extension) {

        alert(
            "拡張子を取得できません。"
        );

        return;

    }

    const confirmed =
        confirm(
            `.${extension}を削除しますか？`
        );

    if (!confirmed) {
        return;
    }

    setActionButtonsDisabled(
        true
    );

    try {

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/file-types/${
                encodeURIComponent(
                    extension
                )
            }`,
            {
                method: "DELETE"
            }
        );

        await loadFileTypes();

    } catch (error) {

        console.error(
            "拡張子削除エラー:",
            error
        );

        alert(
            error.message ||
            "拡張子を削除できませんでした。"
        );

    } finally {

        setActionButtonsDisabled(
            false
        );

    }

}


function setActionButtonsDisabled(
    disabled
) {

    addFileTypeButton.disabled =
        disabled;

    backButton.disabled =
        disabled;

    const buttons =
        fileTypeList.querySelectorAll(
            "button"
        );

    buttons.forEach(
        button => {

            button.disabled =
                disabled;

        }
    );

}


function showListMessage(
    message
) {

    fileTypeList.innerHTML =
        "";

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    row.textContent =
        message;

    fileTypeList.appendChild(
        row
    );

}


function normalizeExtension(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /^\.+/,
            ""
        );

}


function formatExtension(
    value
) {

    const extension =
        normalizeExtension(
            value
        );

    if (!extension) {
        return "";
    }

    return `.${extension}`;

}


function handleBack() {

    location.href =
        "./system_menu.html";

}