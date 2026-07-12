import {
    auth
} from "./firebase-config.js";

import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const userAdminButton =
    document.getElementById(
        "btn-user-admin"
    );

const tenantAdminButton =
    document.getElementById(
        "btn-tenant-admin"
    );

const dataSourceButton =
    document.getElementById(
        "btn-data-source"
    );

const logoutButton =
    document.getElementById(
        "btn-logout"
    );


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await waitForLogin();

        if (userAdminButton) {

            userAdminButton.addEventListener(
                "click",
                handleUserAdmin
            );

        }

        if (tenantAdminButton) {

            tenantAdminButton.addEventListener(
                "click",
                handleTenantAdmin
            );

        }

        if (dataSourceButton) {

            dataSourceButton.addEventListener(
                "click",
                handleDataSource
            );

        }

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                handleLogout
            );

        }

    } catch (error) {

        console.error(
            "メニュー初期化エラー:",
            error
        );

        alert(
            error.message ||
            "ログイン状態を確認できませんでした。"
        );

        location.href =
            "./index.html";

    }

}


async function handleUserAdmin() {

    if (!userAdminButton) {
        return;
    }

    userAdminButton.disabled =
        true;

    try {

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {

            alert(
                "管理権限がありません。"
            );

            return;

        }

        location.href =
            "./general_user_maintenance.html";

    } catch (error) {

        console.error(
            "ユーザー管理権限確認エラー:",
            error
        );

        alert(
            error.message ||
            "管理権限の確認に失敗しました。"
        );

    } finally {

        userAdminButton.disabled =
            false;

    }

}


async function handleTenantAdmin() {

    if (!tenantAdminButton) {
        return;
    }

    tenantAdminButton.disabled =
        true;

    try {

        const session =
            await authenticatedJsonOrThrow(
                `${API_BASE_URL}/session`,
                {
                    method: "POST"
                }
            );

        if (!session.can_manage_users) {

            alert(
                "管理権限がありません。"
            );

            return;

        }

        location.href =
            "./tenant_maintenance.html";

    } catch (error) {

        console.error(
            "テナント管理権限確認エラー:",
            error
        );

        alert(
            error.message ||
            "管理権限の確認に失敗しました。"
        );

    } finally {

        tenantAdminButton.disabled =
            false;

    }

}


async function handleDataSource() {

    if (!dataSourceButton) {
        return;
    }

    dataSourceButton.disabled =
        true;

    try {

        /*
         * ログイン状態と利用可能期間などは
         * session APIで確認する。
         *
         * tenant_idは画面から渡さず、
         * データ取り込みAPI側で
         * ログインユーザーから特定する。
         */
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/session`,
            {
                method: "POST"
            }
        );

        location.href =
            "./data_source.html";

    } catch (error) {

        console.error(
            "データ取り込み利用確認エラー:",
            error
        );

        alert(
            error.message ||
            "データ取り込み画面を利用できません。"
        );

    } finally {

        dataSourceButton.disabled =
            false;

    }

}


async function handleLogout() {

    if (logoutButton) {

        logoutButton.disabled =
            true;

    }

    try {

        await signOut(
            auth
        );

        location.href =
            "./index.html";

    } catch (error) {

        console.error(
            "ログアウトエラー:",
            error
        );

        alert(
            "ログアウトに失敗しました。"
        );

    } finally {

        if (logoutButton) {

            logoutButton.disabled =
                false;

        }

    }

}