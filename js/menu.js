import { auth } from "./firebase-config.js";
import { API_BASE_URL } from "./config.js";
import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const userAdminButton =
    document.getElementById("btn-user-admin");

const logoutButton =
    document.getElementById("btn-logout");

document.addEventListener(
    "DOMContentLoaded",
    initialize
);

async function initialize() {

    try {

        await waitForLogin();

        userAdminButton.addEventListener(
            "click",
            handleUserAdmin
        );

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "ログイン状態を確認できませんでした。"
        );

        location.href = "./index.html";

    }

}

async function handleUserAdmin() {

    userAdminButton.disabled = true;

    try {

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {
            alert("管理権限がありません。");
            return;
        }

        location.href =
            "./general_user_maintenance.html";

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "管理権限の確認に失敗しました。"
        );

    } finally {

        userAdminButton.disabled = false;

    }

}

async function handleLogout() {

    try {

        await signOut(auth);

        location.href = "./index.html";

    } catch (error) {

        console.error(error);

        alert("ログアウトに失敗しました。");

    }

}