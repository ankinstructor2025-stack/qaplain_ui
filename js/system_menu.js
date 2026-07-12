import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";


const adminUserButton =
    document.getElementById(
        "adminUserButton"
    );

const fileTypeButton =
    document.getElementById(
        "fileTypeButton"
    );

const authenticationMethodButton =
    document.getElementById(
        "authenticationMethodButton"
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

        adminUserButton.addEventListener(
            "click",
            handleAdminUser
        );

        fileTypeButton.addEventListener(
            "click",
            handleFileType
        );

        authenticationMethodButton.addEventListener(
            "click",
            handleAuthenticationMethod
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

    } catch (error) {

        console.error(
            "システム管理メニュー初期化エラー:",
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


function handleAdminUser() {

    location.href =
        "./admin_user_maintenance.html";

}


function handleFileType() {

    location.href =
        "./file_type_maintenance.html";

}


function handleAuthenticationMethod() {

    location.href =
        "./authentication_method_maintenance.html";

}


function handleBack() {

    location.href =
        "./menu.html";

}