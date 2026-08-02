// 共用小工具，供各管理頁面使用
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

function clearMessage(el) {
  el.className = "message";
  el.textContent = "";
}

// Supabase 的請求沒有內建逾時，網路狀況不好時（例如連線中斷但沒有明確的
// 失敗回應）await 可能永遠不 resolve 也不 reject，畫面就會卡在「載入中」
// 不會顯示任何錯誤。用這個包一層，逾時就當作失敗處理，讓呼叫端的 catch
// 可以顯示「載入失敗，請重新整理」之類的提示。
function withTimeout(queryPromise, timeoutMs = 15000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("網路連線逾時")), timeoutMs);
  });
  return Promise.race([queryPromise, timeout]).finally(() => clearTimeout(timeoutId));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// 主要負責教練的顏色標示：Jason 橘色、Jacky 藍色、姿羽 綠色
function coachColorClass(coach) {
  if (coach === "Jason") return "coach-jason";
  if (coach === "Jacky") return "coach-jacky";
  if (coach === "姿羽") return "coach-ziyu";
  return "";
}
