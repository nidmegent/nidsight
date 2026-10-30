
/* =====================================================
   NIDMEGENT ESPORTS | ADMIN PANEL
===================================================== */

const API_URL = "https://script.google.com/macros/s/AKfycbwBP_jTuYq9S7gObFb27oDcbmXaxPZKcg4bR5N6CjMj2trV7D-7VWNJYWFoMW3zh9zs/exec";

const state = {
  token: null,
  admin: null,
  members: [],
  applications: [],
  proposals: [],
  announcements: [],
  settings: {}
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3500);
}

function setMessage(selector, message) {
  const el = $(selector);
  if (el) el.textContent = message;
}

async function apiRequest(action, payload = {}, token = state.token) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token, payload })
  });

  if (!response.ok) {
    throw new Error("サーバーとの通信に失敗しました。");
  }

  const result = await response.json();

  if (!result || result.success !== true) {
    throw new Error(result?.message || "処理に失敗しました。");
  }

  return result;
}

function showScreen(screen) {
  $("#loginScreen").classList.toggle("hidden", screen !== "login");
  $("#passwordScreen").classList.toggle("hidden", screen !== "password");
  $("#adminApp").classList.toggle("hidden", screen !== "app");
}

function setFormBusy(form, busy) {
  const button = form.querySelector('[type="submit"]');
  if (!button) return;
  button.disabled = busy;
}

function statusLabel(status) {
  return ({
    PENDING: "確認待ち",
    REVIEWING: "確認中",
    APPROVED: "承認",
    REJECTED: "差し戻し",
    DELETED: "削除済み",
    ACTIVE: "有効",
    SUSPENDED: "停止中"
  })[String(status || "").toUpperCase()] || status || "未設定";
}

function statusClass(status) {
  return String(status || "").toLowerCase();
}

function showAdmin() {
  const name = state.admin?.displayName || state.admin?.memberId || "ADMIN";
  $("#adminName").textContent = name;
  $("#topAdminName").textContent = name;
  showScreen("app");
}

async function loadAll() {
  await Promise.all([
    loadMembers(),
    loadApplications(),
    loadProposals(),
    loadAnnouncements(),
    loadSettings()
  ]);
  updateStats();
}

/* =====================================================
   LOGIN
===================================================== */

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBusy(form, true);
  setMessage("#loginMessage", "認証しています...");

  try {
    const result = await apiRequest("login", {
      memberId: $("#loginId").value.trim(),
      password: $("#loginPassword").value
    }, "");

    if (!result.token || !result.member) {
      throw new Error("認証結果が正しくありません。");
    }

    if (result.member.role !== "ADMIN") {
      throw new Error("管理者権限のないアカウントです。");
    }

    state.token = result.token;
    state.admin = result.member;

    if (result.mustChangePassword === true) {
      showScreen("password");
      return;
    }

    showAdmin();
    await loadAll();
    toast("管理者としてログインしました。");

  } catch (error) {
    setMessage("#loginMessage", error.message);
  } finally {
    setFormBusy(form, false);
  }
});

/* =====================================================
   INITIAL PASSWORD CHANGE
===================================================== */

$("#passwordForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const password = $("#newPassword").value;
  const confirmation = $("#confirmPassword").value;

  if (password !== confirmation) {
    setMessage("#passwordMessage", "パスワードが一致しません。");
    return;
  }

  setFormBusy(form, true);

  try {
    await apiRequest("changePassword", {
      initialSetup: true,
      newPassword: password
    });

    state.token = null;
    state.admin = null;

    showScreen("login");
    $("#loginPassword").value = "";
    setMessage("#loginMessage", "パスワードを変更しました。新しいパスワードで再ログインしてください。");
    toast("パスワードを変更しました。");

  } catch (error) {
    setMessage("#passwordMessage", error.message);
  } finally {
    setFormBusy(form, false);
  }
});

/* =====================================================
   LOGOUT
===================================================== */

$("#logoutButton").addEventListener("click", async () => {
  if (!confirm("ログアウトしますか？")) return;

  try {
    await apiRequest("logout");
  } catch (error) {
    // セッション期限切れの場合も画面側はログアウトする
  }

  state.token = null;
  state.admin = null;
  showScreen("login");
  $("#loginPassword").value = "";
  setMessage("#loginMessage", "");
});

/* =====================================================
   PAGE NAVIGATION
===================================================== */

const PAGE_TITLES = {
  overview: "OVERVIEW",
  members: "MEMBERS",
  applications: "APPLICATIONS",
  proposals: "PROPOSALS",
  announcements: "ANNOUNCEMENTS",
  settings: "SETTINGS"
};

function openPage(page) {
  if (!PAGE_TITLES[page]) return;

  $$(".page").forEach(el => {
    el.classList.toggle("active", el.id === `page-${page}`);
  });

  $$(".nav").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  $("#pageTitle").textContent = PAGE_TITLES[page];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

/* =====================================================
   DASHBOARD / SETTINGS
===================================================== */

async function loadSettings() {
  try {
    const result = await apiRequest("getDashboard");
    state.settings = result.settings || {};

    $("#settingPortalName").value = state.settings.PORTAL_NAME || "";
    $("#settingPremierUrl").value = state.settings.PREMIER_URL || "";
    $("#settingAnalystUrl").value = state.settings.ANALYST_URL || "";
  } catch (error) {
    console.warn("設定情報を取得できませんでした:", error);
  }
}

function updateStats() {
  $("#statMembers").textContent = state.members.length;
  $("#statActive").textContent = state.members.filter(m => m.status === "ACTIVE").length;
  $("#statApplications").textContent = state.applications.filter(a => a.status === "PENDING").length;
  $("#statProposals").textContent = state.proposals.filter(p => p.status === "PENDING").length;
}

/* =====================================================
   MEMBERS
===================================================== */

async function loadMembers() {
  const container = $("#memberList");
  container.innerHTML = '<p class="muted">読み込み中...</p>';

  try {
    const result = await apiRequest("adminListMembers");
    state.members = result.members || [];
    renderMembers();
    updateStats();
  } catch (error) {
    container.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function renderMembers() {
  const keyword = ($("#memberSearch").value || "").toLowerCase();

  const members = state.members.filter(member => {
    const text = [
      member.memberId,
      member.displayName,
      member.division,
      member.role
    ].join(" ").toLowerCase();

    return text.includes(keyword);
  });

  if (!members.length) {
    $("#memberList").innerHTML = '<div class="empty">該当するメンバーはいません。</div>';
    return;
  }

  $("#memberList").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>MEMBER</th>
          <th>DIVISION</th>
          <th>ROLE</th>
          <th>STATUS</th>
          <th>LAST LOGIN</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        ${members.map(member => `
          <tr>
            <td>
              <strong>${escapeHTML(member.displayName)}</strong>
              <small>${escapeHTML(member.memberId)}</small>
            </td>
            <td>${escapeHTML(member.division)}</td>
            <td>${escapeHTML(member.role)}</td>
            <td><span class="badge ${statusClass(member.status)}">${escapeHTML(statusLabel(member.status))}</span></td>
            <td>${escapeHTML(member.lastLoginAt || "未ログイン")}</td>
            <td>
              <div class="action-buttons">
                <button class="mini-btn" data-edit-member="${escapeHTML(member.memberId)}">編集</button>
                <button class="mini-btn" data-reset-member="${escapeHTML(member.memberId)}">PW再設定</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  $$("[data-edit-member]").forEach(button => {
    button.addEventListener("click", () => {
      const member = state.members.find(item => item.memberId === button.dataset.editMember);
      if (member) openMemberEdit(member);
    });
  });

  $$("[data-reset-member]").forEach(button => {
    button.addEventListener("click", () => resetMemberPassword(button.dataset.resetMember));
  });
}

$("#memberSearch").addEventListener("input", renderMembers);
$("#refreshMembers").addEventListener("click", loadMembers);

$("#memberCreateForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  setFormBusy(form, true);

  try {
    const result = await apiRequest("adminCreateMember", {
      memberId: $("#createMemberId").value.trim(),
      displayName: $("#createDisplayName").value.trim(),
      division: $("#createDivision").value,
      role: $("#createRole").value,
      initialPassword: $("#createInitialPassword").value
    });

    toast(result.message || "メンバーを登録しました。");
    form.reset();
    await loadMembers();

  } catch (error) {
    toast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

function openMemberEdit(member) {
  $("#editMemberId").value = member.memberId;
  $("#editDisplayName").value = member.displayName || "";
  $("#editDivision").value = member.division || "OTHER";
  $("#editRole").value = member.role || "MEMBER";
  $("#editStatus").value = member.status || "ACTIVE";
  $("#memberDialog").showModal();
}

$("#memberEditForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    const result = await apiRequest("adminUpdateMember", {
      memberId: $("#editMemberId").value,
      displayName: $("#editDisplayName").value.trim(),
      division: $("#editDivision").value,
      role: $("#editRole").value,
      status: $("#editStatus").value
    });

    $("#memberDialog").close();
    toast(result.message || "メンバー情報を更新しました。");
    await loadMembers();

  } catch (error) {
    toast(error.message);
  }
});

async function resetMemberPassword(memberId) {
  const newPassword = prompt(
    `${memberId} の新しい初期パスワードを入力してください。\n12文字以上で設定してください。`
  );

  if (newPassword === null) return;

  if (newPassword.length < 12) {
    toast("パスワードは12文字以上にしてください。");
    return;
  }

  if (!confirm(`${memberId} のパスワードを再設定しますか？`)) return;

  try {
    const result = await apiRequest("adminResetPassword", {
      memberId,
      newPassword
    });
    toast(result.message || "パスワードを再設定しました。");
    await loadMembers();
  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   APPLICATIONS
===================================================== */

async function loadApplications() {
  $("#applicationList").innerHTML = '<p class="muted">読み込み中...</p>';

  try {
    const result = await apiRequest("adminListApplications");
    state.applications = result.applications || [];
    renderApplications();
    updateStats();
  } catch (error) {
    $("#applicationList").innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function renderApplications() {
  const keyword = ($("#applicationSearch").value || "").toLowerCase();
  const status = $("#applicationFilter").value;

  const items = state.applications.filter(item => {
    const text = [item.displayName, item.memberId, item.eventName, item.division].join(" ").toLowerCase();
    return text.includes(keyword) && (!status || item.status === status);
  });

  if (!items.length) {
    $("#applicationList").innerHTML = '<div class="empty">申請はありません。</div>';
    return;
  }

  $("#applicationList").innerHTML = items.map(item => `
    <article class="record-card">
      <div class="record-top">
        <div>
          <div class="record-meta">${escapeHTML(item.createdAt)} ・ ${escapeHTML(item.displayName)} (${escapeHTML(item.memberId)})</div>
          <h4>${escapeHTML(item.eventName)}</h4>
          <div class="record-meta">${escapeHTML(item.division)} ・ 出場日：${escapeHTML(item.eventDate || "未入力")}</div>
        </div>
        <span class="badge ${statusClass(item.status)}">${escapeHTML(statusLabel(item.status))}</span>
      </div>
      ${item.result ? `<div class="record-extra">大会結果：${escapeHTML(item.result)}</div>` : ""}
      <div class="record-body">${escapeHTML(item.details)}</div>
      ${item.url ? `<a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">関連URLを開く ↗</a>` : ""}
      ${item.adminComment ? `<div class="record-extra">運営コメント：${escapeHTML(item.adminComment)}</div>` : ""}
      <div class="record-actions"><button class="mini-btn" data-review-app="${escapeHTML(item.id)}">申請を確認・更新</button></div>
    </article>
  `).join("");

  $$("[data-review-app]").forEach(button => {
    button.addEventListener("click", () => {
      const item = state.applications.find(a => a.id === button.dataset.reviewApp);
      if (item) openReview("application", item);
    });
  });
}

$("#applicationSearch").addEventListener("input", renderApplications);
$("#applicationFilter").addEventListener("change", renderApplications);
$("#refreshApplications").addEventListener("click", loadApplications);

/* =====================================================
   PROPOSALS
===================================================== */

async function loadProposals() {
  $("#proposalList").innerHTML = '<p class="muted">読み込み中...</p>';

  try {
    const result = await apiRequest("adminListProposals");
    state.proposals = result.proposals || [];
    renderProposals();
    updateStats();
  } catch (error) {
    $("#proposalList").innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function renderProposals() {
  const keyword = ($("#proposalSearch").value || "").toLowerCase();
  const status = $("#proposalFilter").value;

  const items = state.proposals.filter(item => {
    const text = [item.displayName, item.memberId, item.title, item.category, item.division].join(" ").toLowerCase();
    return text.includes(keyword) && (!status || item.status === status);
  });

  if (!items.length) {
    $("#proposalList").innerHTML = '<div class="empty">企画提案はありません。</div>';
    return;
  }

  $("#proposalList").innerHTML = items.map(item => `
    <article class="record-card">
      <div class="record-top">
        <div>
          <div class="record-meta">${escapeHTML(item.createdAt)} ・ ${escapeHTML(item.displayName)} (${escapeHTML(item.memberId)})</div>
          <h4>${escapeHTML(item.title)}</h4>
          <div class="record-meta">${escapeHTML(item.division)} ・ ${escapeHTML(item.category)}</div>
        </div>
        <span class="badge ${statusClass(item.status)}">${escapeHTML(statusLabel(item.status))}</span>
      </div>
      <div class="record-body">${escapeHTML(item.details)}</div>
      <div class="record-extra"><strong>実施目的</strong><br>${escapeHTML(item.purpose)}</div>
      ${item.support ? `<div class="record-extra"><strong>必要な協力</strong><br>${escapeHTML(item.support)}</div>` : ""}
      ${item.adminComment ? `<div class="record-extra">運営コメント：${escapeHTML(item.adminComment)}</div>` : ""}
      <div class="record-actions"><button class="mini-btn" data-review-proposal="${escapeHTML(item.id)}">提案を確認・更新</button></div>
    </article>
  `).join("");

  $$("[data-review-proposal]").forEach(button => {
    button.addEventListener("click", () => {
      const item = state.proposals.find(p => p.id === button.dataset.reviewProposal);
      if (item) openReview("proposal", item);
    });
  });
}

$("#proposalSearch").addEventListener("input", renderProposals);
$("#proposalFilter").addEventListener("change", renderProposals);
$("#refreshProposals").addEventListener("click", loadProposals);

/* =====================================================
   REVIEW DIALOG
===================================================== */

function openReview(type, item) {
  $("#reviewType").value = type;
  $("#reviewId").value = item.id;
  $("#reviewStatus").value = item.status || "PENDING";
  $("#reviewComment").value = item.adminComment || "";
  $("#reviewDialog").showModal();
}

$("#reviewForm").addEventListener("submit", async event => {
  event.preventDefault();

  const type = $("#reviewType").value;
  const id = $("#reviewId").value;
  const status = $("#reviewStatus").value;
  const adminComment = $("#reviewComment").value.trim();

  try {
    if (type === "application") {
      await apiRequest("adminReviewApplication", {
        applicationId: id,
        status,
        adminComment
      });
      await loadApplications();
    } else {
      await apiRequest("adminReviewProposal", {
        proposalId: id,
        status,
        adminComment
      });
      await loadProposals();
    }

    $("#reviewDialog").close();
    toast("確認内容を保存しました。");

  } catch (error) {
    toast(error.message);
  }
});

/* =====================================================
   ANNOUNCEMENTS
===================================================== */

async function loadAnnouncements() {
  /*
   * 公開中のお知らせはgetDashboardから取得できる。
   * 下書き・削除済みを含む管理一覧取得APIは未実装のため、
   * この画面では公開中のお知らせを表示する。
   */
  $("#announcementList").innerHTML = '<p class="muted">読み込み中...</p>';

  try {
    const result = await apiRequest("getDashboard");
    state.announcements = result.announcements || [];
    renderAnnouncements();
  } catch (error) {
    $("#announcementList").innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

function renderAnnouncements() {
  if (!state.announcements.length) {
    $("#announcementList").innerHTML = '<div class="empty">公開中のお知らせはありません。</div>';
    return;
  }

  $("#announcementList").innerHTML = state.announcements.map(item => `
    <article class="record-card">
      <div class="record-top">
        <div>
          <div class="record-meta">${escapeHTML(item.date || "")} ・ 公開中</div>
          <h4>${escapeHTML(item.title)}</h4>
        </div>
        <span class="badge approved">PUBLISHED</span>
      </div>
      <div class="record-body">${escapeHTML(item.content)}</div>
      <div class="record-actions">
        <button class="mini-btn" data-edit-announcement="${escapeHTML(item.id)}">編集</button>
        <button class="mini-btn danger" data-delete-announcement="${escapeHTML(item.id)}">削除</button>
      </div>
    </article>
  `).join("");

  $$("[data-edit-announcement]").forEach(button => {
    button.addEventListener("click", () => {
      const item = state.announcements.find(a => a.id === button.dataset.editAnnouncement);
      if (!item) return;

      $("#announcementId").value = item.id;
      $("#announcementTitle").value = item.title || "";
      $("#announcementContent").value = item.content || "";
      $("#announcementStatus").value = "PUBLISHED";
      $("#announcementFormTitle").textContent = "EDIT ANNOUNCEMENT";
      $("#cancelAnnouncementEdit").classList.remove("hidden");
      $("#announcementForm").scrollIntoView({ behavior: "smooth" });
    });
  });

  $$("[data-delete-announcement]").forEach(button => {
    button.addEventListener("click", () => deleteAnnouncement(button.dataset.deleteAnnouncement));
  });
}

$("#announcementForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  setFormBusy(form, true);

  try {
    const result = await apiRequest("adminSaveAnnouncement", {
      id: $("#announcementId").value || "",
      title: $("#announcementTitle").value.trim(),
      content: $("#announcementContent").value.trim(),
      status: $("#announcementStatus").value
    });

    toast(result.message || "お知らせを保存しました。");
    resetAnnouncementForm();
    await loadAnnouncements();

  } catch (error) {
    toast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

function resetAnnouncementForm() {
  $("#announcementForm").reset();
  $("#announcementId").value = "";
  $("#announcementFormTitle").textContent = "CREATE ANNOUNCEMENT";
  $("#cancelAnnouncementEdit").classList.add("hidden");
}

$("#cancelAnnouncementEdit").addEventListener("click", resetAnnouncementForm);
$("#refreshAnnouncements").addEventListener("click", loadAnnouncements);

async function deleteAnnouncement(id) {
  if (!confirm("このお知らせを削除しますか？")) return;

  try {
    const result = await apiRequest("adminDeleteAnnouncement", { id });
    toast(result.message || "お知らせを削除しました。");
    await loadAnnouncements();
  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   SETTINGS
===================================================== */

$("#settingsForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  setFormBusy(form, true);

  const settings = [
    ["PORTAL_NAME", $("#settingPortalName").value.trim()],
    ["PREMIER_URL", $("#settingPremierUrl").value.trim()],
    ["ANALYST_URL", $("#settingAnalystUrl").value.trim()]
  ];

  try {
    for (const [key, value] of settings) {
      await apiRequest("adminSaveSetting", { key, value });
    }

    toast("設定を保存しました。");
    await loadSettings();

  } catch (error) {
    toast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

/* =====================================================
   DIALOG CLOSE
===================================================== */

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.close);
    if (dialog) dialog.close();
  });
});

/* =====================================================
   URL SAFETY
===================================================== */

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "#";
    return escapeHTML(url.href);
  } catch (error) {
    return "#";
  }
}

/* =====================================================
   INITIAL
===================================================== */

showScreen("login");
