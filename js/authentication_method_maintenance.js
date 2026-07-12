import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const authenticationMethodList =
    document.getElementById(
        "authenticationMethodList"
    );

const newButton =
    document.getElementById(
        "newButton"
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

        newButton.addEventListener(
            "click",
            handleNew
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        await loadAuthenticationMethods();

    } catch (error) {

        console.error(
            "認証方式管理画面初期化エラー:",
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

    showListMessage(
        "読み込み中..."
    );

    try {

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

        renderAuthenticationMethods(
            authenticationMethods
        );

    } catch (error) {

        console.error(
            "認証方式一覧取得エラー:",
            error
        );

        showListMessage(
            error.message ||
            "認証方式一覧を取得できませんでした。"
        );

    }

}


function renderAuthenticationMethods(
    authenticationMethods
) {

    authenticationMethodList.innerHTML =
        "";

    if (
        authenticationMethods.length === 0
    ) {

        showListMessage(
            "認証方式が登録されていません。"
        );

        return;

    }

    authenticationMethods.forEach(
        authenticationMethod => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "list-row";

            row.appendChild(
                createColumn(
                    authenticationMethod.display_name ||
                    authenticationMethod.method_key ||
                    "",
                    "20%"
                )
            );

            row.appendChild(
                createColumn(
                    authenticationMethod.description ||
                    "",
                    "40%"
                )
            );

            row.appendChild(
                createColumn(
                    authenticationMethod.enabled
                        ? "有効"
                        : "無効",
                    "15%"
                )
            );

            row.appendChild(
                createActionColumn(
                    authenticationMethod
                )
            );

            authenticationMethodList.appendChild(
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
    authenticationMethod
) {

    const column =
        document.createElement(
            "div"
        );

    column.style.width =
        "25%";

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
            handleEdit(
                authenticationMethod
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
            handleDelete(
                authenticationMethod
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


function handleNew() {

    location.href =
        "./authentication_method_edit.html";

}


function handleEdit(
    authenticationMethod
) {

    const methodKey =
        normalizeMethodKey(
            authenticationMethod.method_key
        );

    if (!methodKey) {

        alert(
            "認証方式キーを取得できません。"
        );

        return;

    }

    location.href =
        `./authentication_method_edit.html?method_key=${
            encodeURIComponent(
                methodKey
            )
        }`;

}


async function handleDelete(
    authenticationMethod
) {

    const methodKey =
        normalizeMethodKey(
            authenticationMethod.method_key
        );

    if (!methodKey) {

        alert(
            "認証方式キーを取得できません。"
        );

        return;

    }

    const displayName =
        authenticationMethod.display_name ||
        methodKey;

    const confirmed =
        confirm(
            `${displayName}を削除しますか？`
        );

    if (!confirmed) {
        return;
    }

    setActionButtonsDisabled(
        true
    );

    try {

        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/authentication-methods/${
                encodeURIComponent(
                    methodKey
                )
            }`,
            {
                method: "DELETE"
            }
        );

        alert(
            "削除しました。"
        );

        await loadAuthenticationMethods();

    } catch (error) {

        console.error(
            "認証方式削除エラー:",
            error
        );

        alert(
            error.message ||
            "認証方式を削除できませんでした。"
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

    newButton.disabled =
        disabled;

    backButton.disabled =
        disabled;

    const buttons =
        authenticationMethodList.querySelectorAll(
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

    authenticationMethodList.innerHTML =
        "";

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "list-row";

    row.textContent =
        message;

    authenticationMethodList.appendChild(
        row
    );

}


function normalizeMethodKey(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


function handleBack() {

    location.href =
        "./system_menu.html";

}