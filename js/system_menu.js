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
            () => {

                location.href =
                    "./admin_user_maintenance.html";

            }
        );

        fileTypeButton.addEventListener(
            "click",
            () => {

                location.href =
                    "./file_type_maintenance.html";

            }
        );

        backButton.addEventListener(
            "click",
            () => {

                location.href =
                    "./menu.html";

            }
        );

    } catch (error) {

        console.error(
            "system menu error",
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