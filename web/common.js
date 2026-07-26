// 共用小工具，供各管理頁面使用
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

function clearMessage(el) {
  el.className = "message";
  el.textContent = "";
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
