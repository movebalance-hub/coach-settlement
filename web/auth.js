// 簡易共用密碼保護
// 注意：這只是前端擋畫面與擋「頁面自動發出的資料請求」，
// 不是真正的帳號系統。只要 Supabase 的 RLS 沒開，任何人只要
// 願意直接呼叫 Supabase REST API（並帶上公開的 anon key），
// 還是可以繞過這層保護讀寫資料庫。詳見 schema.sql 的說明。
(function () {
  const STORAGE_KEY = "coach_settlement_auth_v1";

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function unlock() {
    document.documentElement.classList.remove("app-locked");
    const overlay = document.getElementById("auth-overlay");
    if (overlay) overlay.remove();
  }

  function isStoredAuthValid() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return !!stored && stored === window.APP_CONFIG.ACCESS_PASSWORD_HASH;
  }

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.innerHTML = `
      <div class="auth-box">
        <h1>請輸入密碼</h1>
        <p>本系統僅供內部使用，請輸入共用密碼以繼續。</p>
        <form id="auth-form" autocomplete="off">
          <input type="password" id="auth-password" autocomplete="current-password" placeholder="密碼" required />
          <button type="submit">進入系統</button>
          <div class="auth-error" id="auth-error"></div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector("#auth-form");
    const input = overlay.querySelector("#auth-password");
    const errorEl = overlay.querySelector("#auth-error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const hash = await sha256Hex(input.value);
      if (hash === window.APP_CONFIG.ACCESS_PASSWORD_HASH) {
        localStorage.setItem(STORAGE_KEY, hash);
        unlock();
        window.dispatchEvent(new CustomEvent("app-authed"));
      } else {
        errorEl.textContent = "密碼錯誤，請再試一次";
        errorEl.style.display = "block";
        input.value = "";
        input.focus();
      }
    });

    input.focus();
  }

  // 供各頁面的資料載入程式呼叫：密碼通過前，callback 不會被執行，
  // 也就不會有任何 Supabase 請求被發出去。
  window.requireAuth = function (callback) {
    window.addEventListener("app-authed", callback, { once: true });
  };

  try {
    if (isStoredAuthValid()) {
      unlock();
      // 用 setTimeout 讓各頁面的 script（呼叫 window.requireAuth）
      // 先完成同步註冊，再送出 authed 事件，避免事件先發生、沒人接到。
      setTimeout(() => window.dispatchEvent(new CustomEvent("app-authed")), 0);
    } else {
      buildOverlay();
    }
  } catch (err) {
    // 例如 config.js 在網路不穩時沒載入成功，window.APP_CONFIG 會是 undefined，
    // 上面兩個分支都會丟例外。不處理的話畫面會卡在鎖定狀態、且沒有任何提示。
    console.error("驗證流程初始化失敗", err);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="auth-fatal-error" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-size:1.1rem;background:#fff;color:#b3261e;">系統載入失敗，請重新整理頁面再試一次</div>'
    );
  }
})();
