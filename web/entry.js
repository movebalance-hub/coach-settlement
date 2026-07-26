const coachSelect = document.getElementById("coach-select");
const newCoachField = document.getElementById("new-coach-field");
const newCoachNameInput = document.getElementById("new-coach-name");
const memberNameInput = document.getElementById("member-name");
const memberNameList = document.getElementById("member-name-list");
const unitPriceInput = document.getElementById("unit-price");
const sessionsUsedInput = document.getElementById("sessions-used");
const remainingSessionsInput = document.getElementById("remaining-sessions");
const salesDateInput = document.getElementById("sales-date");
const form = document.getElementById("entry-form");
const submitBtn = document.getElementById("submit-btn");
const messageBox = document.getElementById("message");
const listBody = document.getElementById("record-list");

const editCard = document.getElementById("edit-card");
const editForm = document.getElementById("edit-form");
const editCoachSelect = document.getElementById("edit-coach");
const editMemberInput = document.getElementById("edit-member");
const editPriceInput = document.getElementById("edit-price");
const editSessionsInput = document.getElementById("edit-sessions");
const editRemainingInput = document.getElementById("edit-remaining");
const editDateInput = document.getElementById("edit-date");
const editCancelBtn = document.getElementById("edit-cancel-btn");
const editSaveBtn = document.getElementById("edit-save-btn");
const editMessageBox = document.getElementById("edit-message");

const NEW_COACH_VALUE = "__new__";

let coachNames = [];
let recordsById = new Map();
let editingId = null;

function showCoachLoadFailure(message) {
  coachSelect.innerHTML = '<option value="">載入失敗，請重新整理頁面</option>';
  coachSelect.disabled = true;
  showMessage(messageBox, `${message}，請重新整理頁面再試一次`, "error");
}

async function loadCoaches() {
  if (!window.dbClient) {
    showCoachLoadFailure("教練清單載入失敗");
    return;
  }

  try {
    const { data, error } = await window.dbClient
      .from("coaches")
      .select("name")
      .order("name");

    if (error) throw error;

    coachNames = data.map((c) => c.name);

    coachSelect.disabled = false;
    coachSelect.innerHTML = '<option value="">請選擇教練</option>';
    for (const name of coachNames) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      coachSelect.appendChild(option);
    }

    const newOption = document.createElement("option");
    newOption.value = NEW_COACH_VALUE;
    newOption.textContent = "+ 新增教練...";
    coachSelect.appendChild(newOption);
  } catch (err) {
    showCoachLoadFailure(`載入教練清單失敗：${err.message}`);
  }
}

async function loadMemberNames() {
  if (!window.dbClient) return;

  try {
    const { data, error } = await window.dbClient
      .from("sales_records")
      .select("member_name")
      .order("member_name");

    if (error) throw error;

    const uniqueNames = [...new Set(data.map((r) => r.member_name))];
    memberNameList.innerHTML = uniqueNames
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  } catch (err) {
    console.error("載入會員姓名清單失敗：", err.message);
  }
}

function viewRowHtml(r) {
  return `
    <tr data-id="${r.id}">
      <td>${r.sales_date}</td>
      <td>${escapeHtml(r.coach_name)}</td>
      <td>${escapeHtml(r.member_name)}</td>
      <td>${r.unit_price}</td>
      <td>${r.sessions_used}</td>
      <td>${r.remaining_sessions}</td>
      <td class="row-actions">
        <button type="button" class="edit-btn" data-id="${r.id}">編輯</button>
        <button type="button" class="delete-btn" data-id="${r.id}">刪除</button>
      </td>
    </tr>`;
}

function highlightEditingRow() {
  for (const tr of listBody.querySelectorAll("tr")) {
    tr.classList.toggle("editing-row", tr.dataset.id === editingId);
  }
}

function openEditForm(record) {
  editingId = record.id;

  const coachOptions = [...new Set([record.coach_name, ...coachNames])];
  editCoachSelect.innerHTML = coachOptions
    .map(
      (name) =>
        `<option value="${escapeHtml(name)}" ${name === record.coach_name ? "selected" : ""}>${escapeHtml(name)}</option>`
    )
    .join("");

  editMemberInput.value = record.member_name;
  editPriceInput.value = record.unit_price;
  editSessionsInput.value = record.sessions_used;
  editRemainingInput.value = record.remaining_sessions;
  editDateInput.value = record.sales_date;

  clearMessage(editMessageBox);
  editCard.style.display = "block";
  highlightEditingRow();
  editCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditForm() {
  editingId = null;
  editCard.style.display = "none";
  highlightEditingRow();
}

async function loadRecentRecords() {
  if (!window.dbClient) {
    listBody.innerHTML = '<tr class="empty-row"><td colspan="7">載入失敗，請重新整理頁面</td></tr>';
    return;
  }

  try {
    const { data, error } = await window.dbClient
      .from("sales_records")
      .select("id, sales_date, coach_name, member_name, unit_price, sessions_used, remaining_sessions")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    recordsById = new Map(data.map((r) => [r.id, r]));

    if (data.length === 0) {
      listBody.innerHTML = '<tr class="empty-row"><td colspan="7">尚無登記紀錄</td></tr>';
      return;
    }

    listBody.innerHTML = data.map(viewRowHtml).join("");
    if (editingId) highlightEditingRow();
  } catch (err) {
    listBody.innerHTML = `<tr class="empty-row"><td colspan="7">載入失敗：${err.message}，請重新整理頁面</td></tr>`;
  }
}

coachSelect.addEventListener("change", () => {
  newCoachField.style.display = coachSelect.value === NEW_COACH_VALUE ? "block" : "none";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageBox);

  let coachName = coachSelect.value;
  if (coachName === NEW_COACH_VALUE) {
    coachName = newCoachNameInput.value.trim();
  }

  const memberName = memberNameInput.value.trim();
  const unitPrice = parseFloat(unitPriceInput.value);
  const sessionsUsed = parseFloat(sessionsUsedInput.value);
  const remainingSessions = parseFloat(remainingSessionsInput.value);

  if (!coachName || !memberName || !unitPrice || !sessionsUsed || isNaN(remainingSessions)) {
    showMessage(messageBox, "請完整填寫所有欄位", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "送出中...";

  if (coachSelect.value === NEW_COACH_VALUE) {
    const { error: coachError } = await window.dbClient
      .from("coaches")
      .upsert({ name: coachName }, { onConflict: "name", ignoreDuplicates: true });

    if (coachError) {
      submitBtn.disabled = false;
      submitBtn.textContent = "送出登記";
      showMessage(messageBox, `新增教練失敗：${coachError.message}`, "error");
      return;
    }
  }

  const { error } = await window.dbClient.from("sales_records").insert({
    sales_date: salesDateInput.value,
    coach_name: coachName,
    member_name: memberName,
    unit_price: unitPrice,
    sessions_used: sessionsUsed,
    remaining_sessions: remainingSessions
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "送出登記";

  if (error) {
    showMessage(messageBox, `登記失敗：${error.message}`, "error");
    return;
  }

  showMessage(messageBox, "登記成功！", "success");
  memberNameInput.value = "";
  unitPriceInput.value = "";
  sessionsUsedInput.value = "";
  remainingSessionsInput.value = "";

  if (coachSelect.value === NEW_COACH_VALUE) {
    newCoachNameInput.value = "";
    newCoachField.style.display = "none";
    await loadCoaches();
    coachSelect.value = coachName;
  }

  await loadRecentRecords();
});

listBody.addEventListener("click", async (event) => {
  const target = event.target;
  const id = target.dataset.id;
  if (!id) return;

  const record = recordsById.get(id);

  if (target.classList.contains("edit-btn")) {
    openEditForm(record);
    return;
  }

  if (target.classList.contains("delete-btn")) {
    const confirmed = confirm(
      `確定要刪除「${record.member_name}」${record.sales_date} 的這筆銷課紀錄嗎？此動作無法復原。`
    );
    if (!confirmed) return;

    const { error } = await window.dbClient.from("sales_records").delete().eq("id", id);
    if (error) {
      showMessage(messageBox, `刪除失敗：${error.message}`, "error");
      return;
    }
    if (id === editingId) closeEditForm();
    showMessage(messageBox, "已刪除該筆紀錄", "success");
    await loadRecentRecords();
    return;
  }
});

editCancelBtn.addEventListener("click", () => {
  closeEditForm();
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(editMessageBox);

  if (!editingId) return;

  const updated = {
    sales_date: editDateInput.value,
    coach_name: editCoachSelect.value,
    member_name: editMemberInput.value.trim(),
    unit_price: parseFloat(editPriceInput.value),
    sessions_used: parseFloat(editSessionsInput.value),
    remaining_sessions: parseFloat(editRemainingInput.value)
  };

  if (
    !updated.coach_name ||
    !updated.member_name ||
    !updated.unit_price ||
    !updated.sessions_used ||
    isNaN(updated.remaining_sessions)
  ) {
    showMessage(editMessageBox, "請完整填寫所有欄位", "error");
    return;
  }

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = "儲存中...";

  const { error } = await window.dbClient.from("sales_records").update(updated).eq("id", editingId);

  editSaveBtn.disabled = false;
  editSaveBtn.textContent = "儲存";

  if (error) {
    showMessage(editMessageBox, `更新失敗：${error.message}`, "error");
    return;
  }

  closeEditForm();
  showMessage(messageBox, "已更新該筆紀錄", "success");
  await loadRecentRecords();
});

salesDateInput.value = new Date().toISOString().slice(0, 10);
window.requireAuth(() => {
  loadCoaches();
  loadRecentRecords();
  loadMemberNames();
});
