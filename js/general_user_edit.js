import {
    API_BASE_URL
} from "./config.js";

import {
    waitForLogin,
    authenticatedJsonOrThrow
} from "./common.js";

const saveButton =
    document.getElementById("saveButton");

const backButton =
    document.getElementById("backButton");

const userNameInput =
    document.getElementById("userName");

const emailInput =
    document.getElementById("email");

const userTypeInput =
    document.getElementById("userType");

const startDateInput =
    document.getElementById("startDate");

const endDateInput =
    document.getElementById("endDate");

const generalUserId =
    new URLSearchParams(
        location.search
    ).get("id");

document.addEventListener(
    "DOMContentLoaded",
    initialize
);

async function initialize() {

    try {

        await waitForLogin();

        saveButton.addEventListener(
            "click",
            handleSave
        );

        backButton.addEventListener(
            "click",
            handleBack
        );

        if (generalUserId) {
            await loadGeneralUser();
        }

    } catch (error) {

        console.error(error);

        alert("初期化に失敗しました。");

    }

}

async function loadGeneralUser() {

    const user =
        await authenticatedJsonOrThrow(
            `${API_BASE_URL}/general-users/${encodeURIComponent(generalUserId)}`,
            {
                method: "GET"
            }
        );

    userNameInput.value =
        user.user_name || "";

    emailInput.value =
        user.email || "";

    userTypeInput.value =
        user.user_type || "GENERAL";

    startDateInput.value =
        formatDate(user.start_date);

    endDateInput.value =
        formatDate(user.end_date);

}

async function handleSave() {

    const body = {
        user_name:
            userNameInput.value.trim(),

        email:
            emailInput.value.trim(),

        user_type:
            userTypeInput.value,

        start_date:
            startDateInput.value,

        end_date:
            endDateInput.value || null
    };

    const url =
        generalUserId
            ? `${API_BASE_URL}/general-users/${encodeURIComponent(generalUserId)}`
            : `${API_BASE_URL}/general-users`;

    const method =
        generalUserId
            ? "PUT"
            : "POST";

    try {

        await authenticatedJsonOrThrow(
            url,
            {
                method,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(body)
            }
        );

        alert("保存しました。");

        location.href =
            "./general_user_maintenance.html";

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "保存に失敗しました。"
        );

    }

}

function handleBack() {

    location.href =
        "./general_user_maintenance.html";

}

function formatDate(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .substring(0, 10);

}
