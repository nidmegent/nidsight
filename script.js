/* =====================================================
   NIDMEGENT ESPORTS
   MEMBER DASHBOARD FRONTEND
===================================================== */

/*
 * Google Apps ScriptのWebアプリURLを、
 * バックエンド完成後に設定する。
 *
 * URLが空の場合、ログイン・申請通信は行わない。
 */
const API_URL = "https://script.google.com/macros/s/AKfycbwBP_jTuYq9S7gObFb27oDcbmXaxPZKcg4bR5N6CjMj2trV7D-7VWNJYWFoMW3zh9zs/exec";


/* =====================================================
   STATE
===================================================== */

const state = {
  token: null,
  member: null,
  activeTab: "home",
  busy: false
};

let toastTimer = null;


/* =====================================================
   DOM HELPERS
===================================================== */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];

function showMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function setBusy(form, busy) {
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');

  if (!button) return;

  button.disabled = busy;
  button.style.opacity = busy ? ".6" : "";
  button.style.cursor = busy ? "wait" : "";
}


/* =====================================================
   SCREEN MANAGEMENT
===================================================== */

function showLoginScreen() {
  $("#loginScreen").classList.remove("hidden");
  $("#passwordSetupScreen").classList.add("hidden");
  $("#app").classList.add("hidden");
  $("#mobileNav").classList.add("hidden");
}

function showPasswordSetupScreen() {
  $("#loginScreen").classList.add("hidden");
  $("#passwordSetupScreen").classList.remove("hidden");
  $("#app").classList.add("hidden");
  $("#mobileNav").classList.add("hidden");
}

function showApp() {
  $("#loginScreen").classList.add("hidden");
  $("#passwordSetupScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#mobileNav").classList.remove("hidden");
}


/* =====================================================
   TAB NAVIGATION
===================================================== */

const TAB_TITLES = {
  home: "DASHBOARD",
  application: "APPLICATION",
  premier: "PREMIER",
  analyst: "VALORANT ANALYST",
  mypage: "MY PAGE"
};

function switchTab(tabName) {
  if (!Object.prototype.hasOwnProperty.call(TAB_TITLES, tabName)) {
    return;
  }

  state.activeTab = tabName;

  $$(".tab-panel").forEach(panel => {
    panel.classList.toggle(
      "active",
      panel.id === `tab-${tabName}`
    );
  });

  $$("[data-tab]").forEach(button => {
    const active = button.dataset.tab === tabName;

    if (
      button.classList.contains("nav-item") ||
      button.classList.contains("mobile-nav-item")
    ) {
      button.classList.toggle("active", active);
    }
  });

  $("#pageTitle").textContent = TAB_TITLES[tabName];

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-tab]");

  if (!button) return;

  event.preventDefault();

  if (!state.member || !state.token) {
    return;
  }

  switchTab(button.dataset.tab);
});


/* =====================================================
   PROFILE DISPLAY
===================================================== */

function renderProfile(member) {
  const name = member.displayName || "MEMBER";
  const division = member.division || "UNASSIGNED";
  const role = member.role || "MEMBER";
  const id = member.memberId || "-";

  // ヘッダー
  $("#headerMemberName").textContent = name;
  $("#headerDivision").textContent = division;

  // MY PAGE
  $("#profileName").textContent = name;
  $("#profileDivision").textContent = division;
  $("#profileDivisionDetail").textContent = division;
  $("#profileRole").textContent = role;
  $("#profileId").textContent = id;

  // アバター
  const initial = name.trim().charAt(0).toUpperCase() || "N";

  $("#profileAvatar").textContent = initial;
  $(".user-avatar").textContent = initial;

  // ADMIN PAGE：管理者のみ表示
  const isAdmin = String(role).trim().toUpperCase() === "ADMIN";

  const adminPageNav = $("#adminPageNav");
  const adminPageMobileNav = $("#adminPageMobileNav");

  if (adminPageNav) {
    adminPageNav.style.display = isAdmin ? "flex" : "none";
  }

  if (adminPageMobileNav) {
    adminPageMobileNav.style.display = isAdmin ? "flex" : "none";
  }
}


/* =====================================================
   SAFE HTML HELPERS
===================================================== */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}


/* =====================================================
   ANNOUNCEMENTS
===================================================== */

function renderAnnouncements(items = []) {
  const container = $("#announcementList");

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">◇</span>
        <p>現在、お知らせはありません。</p>
      </div>
    `;

    return;
  }

  container.innerHTML = items.map(item => `
    <article class="announcement-item">
      <div>
        <div class="announcement-meta">
          ${escapeHTML(item.date || "")}
        </div>

        <h4>${escapeHTML(item.title || "")}</h4>

        <p>${escapeHTML(item.content || "")}</p>
      </div>
    </article>
  `).join("");
}


/* =====================================================
   APPLICATION HISTORY
===================================================== */

function getStatusLabel(status) {
  const labels = {
    pending: "確認待ち",
    reviewing: "確認中",
    approved: "承認",
    rejected: "差し戻し",
    returned: "差し戻し"
  };

  return labels[status] || "受付済み";
}

function renderApplications(items = [], target) {
  const container = $(target);

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>申請履歴はまだありません。</p>
      </div>
    `;

    return;
  }

  container.innerHTML = items.map(item => `
    <article class="application-item">
      <div>
        <div class="announcement-meta">
          ${escapeHTML(item.createdAt || "")}
          ・
          ${escapeHTML(item.typeLabel || "申請")}
        </div>

        <h4>${escapeHTML(item.title || "")}</h4>

        <p>${escapeHTML(item.details || "")}</p>
      </div>

      <span class="role-badge">
        ${escapeHTML(getStatusLabel(item.status))}
      </span>
    </article>
  `).join("");
}


/* =====================================================
   BACKEND COMMUNICATION
===================================================== */

/*
 * バックエンド実装後、認証済みの通信処理を
 * ここから呼び出す。
 *
 * API_URL未設定の場合は必ず失敗させる。
 * 仮のログインや仮の申請成功は表示しない。
 */

async function apiRequest(action, payload = {}) {
  if (!API_URL) {
    throw new Error(
      "バックエンド未設定です。Code.gsの公開設定とAPI_URLを確認してください。"
    );
  }

  /*
   * 注意：
   * Google Apps Scriptとの通信方法は、
   * バックエンド側の実装と合わせる必要がある。
   *
   * 認証情報やパスワードをURLのクエリ文字列に
   * 含めないこと。
   */

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      token: state.token,
      payload
    })
  });

  if (!response.ok) {
    throw new Error("サーバーとの通信に失敗しました。");
  }

  const result = await response.json();

  if (!result || result.success !== true) {
    throw new Error(
      result?.message || "処理に失敗しました。"
    );
  }

  return result;
}


/* =====================================================
   LOGIN
===================================================== */

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (state.busy) return;

  const form = event.currentTarget;
  const message = $("#loginMessage");

  const memberId = $("#loginId").value.trim();
  const password = $("#loginPassword").value;

  if (!memberId || !password) {
    showMessage(message, "IDとパスワードを入力してください。", "error");
    return;
  }

  if (!API_URL) {
    showMessage(
      message,
      "現在、認証サーバーの設定中です。バックエンド完成後にログインできます。",
      "error"
    );

    return;
  }

  state.busy = true;
  setBusy(form, true);

  showMessage(message, "認証しています...");

  try {
    const result = await apiRequest("login", {
      memberId,
      password
    });

    if (!result.token || !result.member) {
      throw new Error("認証結果が正しくありません。");
    }

    state.token = result.token;
    state.member = result.member;

    /*
     * 初期パスワード変更が必要な場合は、
     * バックエンドから返されたフラグを使う。
     */
    if (result.mustChangePassword === true) {
      showPasswordSetupScreen();
      return;
    }

    renderProfile(state.member);
    showApp();

    await loadDashboard();

    switchTab("home");

  } catch (error) {
    showMessage(
      message,
      error.message || "ログインに失敗しました。",
      "error"
    );
  } finally {
    state.busy = false;
    setBusy(form, false);
  }
});


/* =====================================================
   INITIAL PASSWORD CHANGE
===================================================== */

$("#initialPasswordForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const message = $("#initialPasswordMessage");

  const password = $("#initialNewPassword").value;
  const confirmation = $("#initialConfirmPassword").value;

  if (password.length < 8) {
    showMessage(message, "パスワードは8文字以上にしてください。", "error");
    return;
  }

  if (password !== confirmation) {
    showMessage(message, "パスワードが一致しません。", "error");
    return;
  }

  if (!state.token) {
    showMessage(message, "再度ログインしてください。", "error");
    showLoginScreen();
    return;
  }

  setBusy(form, true);

  try {
    await apiRequest("changePassword", {
      currentPassword: "",
      newPassword: password,
      initialSetup: true
    });

    $("#loginPassword").value = "";
    $("#initialNewPassword").value = "";
    $("#initialConfirmPassword").value = "";

    state.token = null;
    state.member = null;

    showLoginScreen();

    showMessage(
      $("#loginMessage"),
      "パスワードを変更しました。新しいパスワードでログインしてください。",
      "success"
    );

  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    setBusy(form, false);
  }
});


/* =====================================================
   PASSWORD CHANGE
===================================================== */

$("#changePasswordForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const message = $("#changePasswordMessage");

  const currentPassword = $("#currentPassword").value;
  const newPassword = $("#newPassword").value;
  const confirmation = $("#confirmPassword").value;

  if (newPassword.length < 12) {
    showMessage(message, "新しいパスワードは12文字以上にしてください。", "error");
    return;
  }

  if (newPassword !== confirmation) {
    showMessage(message, "新しいパスワードが一致しません。", "error");
    return;
  }

  if (currentPassword === newPassword) {
    showMessage(message, "現在と異なるパスワードを設定してください。", "error");
    return;
  }

  setBusy(form, true);

  try {
    await apiRequest("changePassword", {
      currentPassword,
      newPassword,
      initialSetup: false
    });

    form.reset();

    showMessage(
      message,
      "パスワードを変更しました。",
      "success"
    );

  } catch (error) {
    showMessage(
      message,
      error.message || "パスワードの変更に失敗しました。",
      "error"
    );
  } finally {
    setBusy(form, false);
  }
});


/* =====================================================
   COMPETITION APPLICATION
===================================================== */

$("#competitionForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const message = $("#competitionMessage");

  const data = Object.fromEntries(new FormData(form).entries());

  setBusy(form, true);
  showMessage(message, "申請を送信しています...");

  try {
    await apiRequest("submitCompetition", data);

    form.reset();

    showMessage(
      message,
      "大会出場申請を送信しました。",
      "success"
    );

    showToast("大会出場申請を送信しました。");

    await loadDashboard();

  } catch (error) {
    showMessage(
      message,
      error.message || "申請に失敗しました。",
      "error"
    );
  } finally {
    setBusy(form, false);
  }
});


/* =====================================================
   PROJECT PROPOSAL
===================================================== */

$("#proposalForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const message = $("#proposalMessage");

  const data = Object.fromEntries(new FormData(form).entries());

  setBusy(form, true);
  showMessage(message, "企画提案を送信しています...");

  try {
    await apiRequest("submitProposal", data);

    form.reset();

    showMessage(
      message,
      "企画提案を送信しました。",
      "success"
    );

    showToast("企画提案を送信しました。");

    await loadDashboard();

  } catch (error) {
    showMessage(
      message,
      error.message || "企画提案に失敗しました。",
      "error"
    );
  } finally {
    setBusy(form, false);
  }
});


/* =====================================================
   APPLICATION FORM TABS
===================================================== */

$$("[data-form]").forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.form;

    $$("[data-form]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    $("#competitionFormPanel").classList.toggle(
      "hidden",
      type !== "competition"
    );

    $("#proposalFormPanel").classList.toggle(
      "hidden",
      type !== "proposal"
    );
  });
});


/* =====================================================
   DASHBOARD DATA
===================================================== */

async function loadDashboard() {
  if (!state.token) return;

  try {
    const result = await apiRequest("getDashboard");

    renderAnnouncements(result.announcements || []);

    const applications = result.applications || [];

    renderApplications(
      applications.slice(0, 3),
      "#recentApplications"
    );

    renderApplications(
      applications,
      "#applicationHistory"
    );

  } catch (error) {
    console.error("Dashboard loading failed:", error);

    renderAnnouncements([]);

    renderApplications([], "#recentApplications");
    renderApplications([], "#applicationHistory");
  }
}


/* =====================================================
   LOGOUT
===================================================== */

$("#logoutButton").addEventListener("click", async () => {
  if (!state.token) {
    showLoginScreen();
    return;
  }

  try {
    await apiRequest("logout");
  } catch (error) {
    console.warn("Logout request failed:", error);
  }

  state.token = null;
  state.member = null;
  state.activeTab = "home";

  $("#loginForm").reset();

  showLoginScreen();

  showMessage(
    $("#loginMessage"),
    "ログアウトしました。",
    "success"
  );
});


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /*
   * セッショントークンをlocalStorageに保存しない。
   * ページの再読み込み後は再ログインする設計。
   *
   * 実際の認証方式とセッション管理は、
   * バックエンド側と合わせて実装する。
   */

  showLoginScreen();

  renderAnnouncements([]);

  renderApplications([], "#recentApplications");
  renderApplications([], "#applicationHistory");
});
