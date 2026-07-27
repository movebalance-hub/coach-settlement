const monthSelect = document.getElementById("month-select");
const messageBox = document.getElementById("message");
const priceListBody = document.getElementById("price-list");
const coachListBody = document.getElementById("coach-list-report");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");

function monthRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const toISO = (d) => d.toISOString().slice(0, 10);
  return { start: toISO(firstDay), end: toISO(lastDay) };
}

function showReportLoadFailure(message) {
  priceListBody.innerHTML = '<tr class="empty-row"><td colspan="2">載入失敗，請重新整理頁面</td></tr>';
  coachListBody.innerHTML = '<tr class="empty-row"><td colspan="3">載入失敗，請重新整理頁面</td></tr>';
  showMessage(messageBox, `${message}，請重新整理頁面再試一次`, "error");
}

async function loadReport() {
  clearMessage(messageBox);

  if (!window.dbClient) {
    showReportLoadFailure("報表載入失敗");
    return;
  }

  const { start, end } = monthRange(monthSelect.value);

  try {
    const { data, error } = await withTimeout(
      window.dbClient
        .from("sales_records")
        .select("coach_name, unit_price, sessions_used, amount")
        .gte("sales_date", start)
        .lte("sales_date", end)
    );

    if (error) throw error;

    if (data.length === 0) {
      priceListBody.innerHTML = '<tr class="empty-row"><td colspan="2">本月無銷課紀錄</td></tr>';
      coachListBody.innerHTML = '<tr class="empty-row"><td colspan="3">本月無銷課紀錄</td></tr>';
      return;
    }

    const byPrice = new Map();
    const byCoach = new Map();

    for (const r of data) {
      byPrice.set(r.unit_price, (byPrice.get(r.unit_price) || 0) + Number(r.sessions_used));

      const coachStats = byCoach.get(r.coach_name) || { sessions: 0, amount: 0 };
      coachStats.sessions += Number(r.sessions_used);
      coachStats.amount += Number(r.amount);
      byCoach.set(r.coach_name, coachStats);
    }

    const priceRows = [...byPrice.entries()].sort((a, b) => a[0] - b[0]);
    priceListBody.innerHTML = priceRows
      .map(([price, sessions]) => `<tr><td>${price}</td><td>${sessions}</td></tr>`)
      .join("");

    const coachRows = [...byCoach.entries()].sort((a, b) => b[1].amount - a[1].amount);
    coachListBody.innerHTML = coachRows
      .map(
        ([coach, stats]) =>
          `<tr><td>${escapeHtml(coach)}</td><td>${stats.sessions}</td><td>${stats.amount}</td></tr>`
      )
      .join("");
  } catch (err) {
    showReportLoadFailure(`載入報表失敗：${err.message}`);
  }
}

function monthLabel(monthValue) {
  const [year, month] = monthValue.split("-");
  return `${year}年${month}月`;
}

function exportMarkerKey(monthValue) {
  return `sales_export_${monthValue}`;
}

function toCsvValue(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function fetchMonthRecords(monthValue) {
  const { start, end } = monthRange(monthValue);
  return window.dbClient
    .from("sales_records")
    .select("sales_date, coach_name, member_name, unit_price, sessions_used, remaining_sessions")
    .gte("sales_date", start)
    .lte("sales_date", end)
    .order("sales_date");
}

async function handleExport() {
  clearMessage(messageBox);
  const monthValue = monthSelect.value;

  const { data, error } = await fetchMonthRecords(monthValue);
  if (error) {
    showMessage(messageBox, `匯出失敗：${error.message}`, "error");
    return;
  }

  if (data.length === 0) {
    showMessage(messageBox, `${monthLabel(monthValue)}沒有紀錄可匯出`, "error");
    return;
  }

  const header = ["日期", "教練", "會員", "單價", "堂數", "剩餘堂數"];
  const rows = data.map((r) => [
    r.sales_date,
    r.coach_name,
    r.member_name,
    r.unit_price,
    r.sessions_used,
    r.remaining_sessions
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `銷課紀錄_${monthValue}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  localStorage.setItem(
    exportMarkerKey(monthValue),
    JSON.stringify({ count: data.length, exportedAt: new Date().toISOString() })
  );

  showMessage(messageBox, `已匯出「${monthLabel(monthValue)}」共 ${data.length} 筆紀錄`, "success");
}

async function handleClear() {
  clearMessage(messageBox);
  const monthValue = monthSelect.value;

  const { data, error } = await fetchMonthRecords(monthValue);
  if (error) {
    showMessage(messageBox, `讀取失敗：${error.message}`, "error");
    return;
  }

  if (data.length === 0) {
    showMessage(messageBox, `${monthLabel(monthValue)}沒有紀錄可清空`, "error");
    return;
  }

  const markerRaw = localStorage.getItem(exportMarkerKey(monthValue));
  const marker = markerRaw ? JSON.parse(markerRaw) : null;

  if (!marker || marker.count !== data.length) {
    showMessage(
      messageBox,
      `請先匯出「${monthLabel(monthValue)}」目前的 ${data.length} 筆紀錄後再清空（尚未匯出，或匯出後資料筆數有變動）`,
      "error"
    );
    return;
  }

  const confirmed = confirm(
    `即將刪除「${monthLabel(monthValue)}」共 ${data.length} 筆銷課紀錄，此動作無法復原，確定要清空嗎？`
  );
  if (!confirmed) return;

  const { start, end } = monthRange(monthValue);
  const { error: deleteError } = await window.dbClient
    .from("sales_records")
    .delete()
    .gte("sales_date", start)
    .lte("sales_date", end);

  if (deleteError) {
    showMessage(messageBox, `清空失敗：${deleteError.message}`, "error");
    return;
  }

  localStorage.removeItem(exportMarkerKey(monthValue));
  showMessage(messageBox, `已清空「${monthLabel(monthValue)}」共 ${data.length} 筆紀錄`, "success");
  await loadReport();
}

exportBtn.addEventListener("click", handleExport);
clearBtn.addEventListener("click", handleClear);

monthSelect.addEventListener("change", loadReport);

monthSelect.value = new Date().toISOString().slice(0, 7);
window.requireAuth(loadReport);
