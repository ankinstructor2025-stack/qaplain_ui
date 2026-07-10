document.addEventListener("DOMContentLoaded", async () => {
    try {
        // ログイン確認
        const user = await waitForLogin();

        // IDトークン取得
        const idToken = await user.getIdToken(true);

        // 管理者チェック
        const response = await fetch(`${API_BASE_URL}/system-admin`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${idToken}`
            }
        });

        if (!response.ok) {
            throw new Error("管理者確認エラー");
        }

        const result = await response.json();

        if (!result.is_system_administrator) {
            alert("管理者権限がありません。");
            location.href = "menu.html";
            return;
        }

        // ログインユーザー表示
        document.getElementById("loginUser").textContent =
            user.displayName || user.email;

        // 初期ロード
        await loadAdminUsers(idToken);

    } catch (e) {
        console.error(e);
        alert("ログイン情報を確認できませんでした。");
        location.href = "index.html";
    }
});

async function loadAdminUsers(idToken) {

    const response = await fetch(`${API_BASE_URL}/admin-users`, {
        headers: {
            "Authorization": `Bearer ${idToken}`
        }
    });

    if (!response.ok) {
        alert("ユーザー一覧取得失敗");
        return;
    }

    const users = await response.json();

    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";

    users.forEach(user => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${user.user_name}</td>
            <td>${user.email}</td>
            <td>${user.start_date}</td>
            <td>${user.end_date}</td>
            <td>
                <button onclick="editUser('${user.id}')">編集</button>
                <button onclick="deleteUser('${user.id}')">削除</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function addUser() {

    alert("追加処理は後で実装");
}

async function editUser(id) {

    alert(`編集 ${id}`);
}

async function deleteUser(id) {

    if (!confirm("削除しますか？")) {
        return;
    }

    const user = auth.currentUser;

    const idToken = await user.getIdToken(true);

    const response = await fetch(`${API_BASE_URL}/admin-users/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${idToken}`
        }
    });

    if (!response.ok) {
        alert("削除失敗");
        return;
    }

    await loadAdminUsers(idToken);
}
