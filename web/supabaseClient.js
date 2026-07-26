// 建立共用的 Supabase client（供各頁面共用）
// 依賴 config.js 先載入，以及 supabase-js CDN 的全域 `supabase` 物件
window.dbClient = supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);
