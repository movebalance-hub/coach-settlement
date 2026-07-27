// 簡易共用密碼保護
// 注意：這只是前端擋畫面與擋「頁面自動發出的資料請求」，
// 不是真正的帳號系統。只要 Supabase 的 RLS 沒開，任何人只要
// 願意直接呼叫 Supabase REST API（並帶上公開的 anon key），
// 還是可以繞過這層保護讀寫資料庫。詳見 schema.sql 的說明。
(function () {
  const STORAGE_KEY = "coach_settlement_auth_v1";

  // 記錄目前是否已通過驗證，讓 requireAuth 在任何時間點呼叫都能拿到正確結果，
  // 不依賴「app-authed 事件觸發時，各頁面 script 是否已經跑到 requireAuth」這種時序假設。
  // 過去用 setTimeout(..., 0) 讓事件晚一點觸發，指望後面的 <script> 標籤都已經
  // 同步執行完畢並註冊好監聽器；但瀏覽器在等待後續 script 的網路請求（例如剛部署、
  // 檔名帶新的 cache-busting 版本號、瀏覽器快取未命中）時，是可能先去處理已經
  // 到時間的 timer 的。一旦 setTimeout 搶先觸發，事件會派送給「目前」還沒有人監聽
  // 的 window，而 { once: true } 讓這個事件永遠不會再發第二次，等後面的頁面 script
  // 才呼叫 requireAuth 註冊監聽器時就再也等不到了——畫面會卡在初始的「載入中」文字，
  // 且不會有任何錯誤訊息，因為沒有任何 request 真的失敗，只是根本沒被呼叫。
  let authed = false;

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
        authed = true;
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
  // 也就不會有任何 Supabase 請求被發出去。若呼叫當下已經通過驗證（例如密碼
  // 已記住），就直接執行 callback，不必等事件；避免任何時序上的競爭條件。
  window.requireAuth = function (callback) {
    if (authed) {
      callback();
      return;
    }
    window.addEventListener("app-authed", callback, { once: true });
  };

  try {
    if (isStoredAuthValid()) {
      unlock();
      authed = true;
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
