// 建立共用的 Supabase client（供各頁面共用）
// 依賴 config.js 先載入，以及 supabase-js CDN 的全域 `supabase` 物件
//
// 手機在網路不穩時，CDN 載入的 supabase-js 或 config.js 有可能失敗／延遲，
// 導致這裡的 `supabase` 全域物件還不存在。過去這裡會直接丟出例外，讓
// window.dbClient 永遠不會被賦值，後面每個頁面呼叫 window.dbClient.from(...)
// 時就會再丟出一次例外，而且是在 async function 裡同步丟出、沒人 catch，
// 變成「靜默的 unhandled promise rejection」，畫面上完全看不出來哪裡失敗。
// 這裡改成不丟例外，讓 window.dbClient 保持 null，交由各頁面的載入函式
// 統一判斷並顯示「載入失敗，請重新整理」的提示。
if (typeof supabase === "undefined" || !window.APP_CONFIG) {
  console.error("Supabase client 初始化失敗：supabase-js 或設定檔尚未載入完成");
  window.dbClient = null;
} else {
  window.dbClient = supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY,
    { db: { schema: "coach_settlement" } }
  );
}
