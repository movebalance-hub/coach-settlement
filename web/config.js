// Supabase 連線設定
// 之後要抽換環境（例如換 anon key、換專案、或改走後端代理）時，只需要改這個檔案。
window.APP_CONFIG = {
  SUPABASE_URL: "https://kdfsgguyaxrbyctxnlih.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_MCjbNZmcI0LVmDjGOqUosg_6vnxDeJv",
  // 共用密碼的 SHA-256 雜湊值（僅前端擋畫面用，不是真正的帳號驗證）。
  // 要換密碼：用瀏覽器 console 執行
  //   crypto.subtle.digest("SHA-256", new TextEncoder().encode("你的新密碼")).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))
  // 把印出來的字串貼到下面即可。
  ACCESS_PASSWORD_HASH: "7f537bcb60cba76ce694e4df0c0d79cb9079b5a9b1883666502fd04444ec2923"
};
