const coachSelect = document.getElementById("coach-select");
const newCoachField = document.getElementById("new-coach-field");
const newCoachNameInput = document.getElementById("new-coach-name");
const oneTimeCheckbox = document.getElementById("one-time-member");
const memberNameInput = document.getElementById("member-name");
const memberNameList = document.getElementById("member-name-list");
const memberCurrentRemainingField = document.getElementById("member-current-remaining-field");
const memberCurrentRemainingInput = document.getElementById("member-current-remaining");
const unitPriceInput = document.getElementById("unit-price");
const sessionsUsedInput = document.getElementById("sessions-used");
const salesDateInput = document.getElementById("sales-date");
const form = document.getElementById("entry-form");
const submitBtn = document.getElementById("submit-btn");
const messageBox = document.getElementById("message");
const listBody = document.getElementById("record-list");

const editCard = document.getElementById("edit-card");
const editForm = document.getElementById("edit-form");
const editCoachSelect = document.getElementById("edit-coach");
const editOneTimeCheckbox = document.getElementById("edit-one-time-member");
const editMemberInput = document.getElementById("edit-member");
const editMemberList = document.getElementById("edit-member-list");
const editMemberCurrentRemainingField = document.getElementById("edit-member-current-remaining-field");
const editMemberCurrentRemainingInput = document.getElementById("edit-member-current-remaining");
const editPriceInput = document.getElementById("edit-price");
const editSessionsInput = document.getElementById("edit-sessions");
const editDateInput = document.getElementById("edit-date");
const editCancelBtn = document.getElementById("edit-cancel-btn");
const editSaveBtn = document.getElementById("edit-save-btn");
const editMessageBox = document.getElementById("edit-message");

const NEW_COACH_VALUE = "__new__";

let coachNames = [];
let recordsById = new Map();
let editingId = null;

let membersByName = new Map();
let membersById = new Map();
let mainMatchedMemberId = null;
let editMatchedMemberId = null;

const memberNameCombobox = createMemberCombobox(memberNameInput, memberNameList);
const editMemberCombobox = createMemberCombobox(editMemberInput, editMemberList);

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
    const { data, error } = await withTimeout(
      window.dbClient.from("coaches").select("name").order("name")
    );

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

async function loadMembers() {
  if (!window.dbClient) {
    showMessage(messageBox, "會員名單載入失敗，自動帶入單價與剩餘堂數可能無法使用，請重新整理頁面", "error");
    return;
  }

  try {
    const { data, error } = await withTimeout(
      window.dbClient
        .from("members")
        .select("id, name, unit_price, remaining_sessions, primary_coach")
        .order("name")
    );

    if (error) throw error;

    membersByName = new Map(data.map((m) => [m.name, m]));
    membersById = new Map(data.map((m) => [m.id, m]));

    memberNameCombobox.setMembers(data);
    editMemberCombobox.setMembers(data);
  } catch (err) {
    console.error("載入會員清單失敗：", err.message);
    showMessage(messageBox, `會員名單載入失敗：${err.message}，自動帶入單價與剩餘堂數可能無法使用，請重新整理頁面`, "error");
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
  editMatchedMemberId = record.member_id || null;
  const member = record.member_id ? membersById.get(record.member_id) : null;
  editOneTimeCheckbox.checked = !record.member_id;
  editMemberCurrentRemainingField.style.display = record.member_id ? "block" : "none";
  editMemberCurrentRemainingInput.value = member ? member.remaining_sessions : "";
  editPriceInput.value = record.unit_price;
  editSessionsInput.value = record.sessions_used;
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
    const { data, error } = await withTimeout(
      window.dbClient
        .from("sales_records")
        .select("id, sales_date, coach_name, member_name, member_id, unit_price, sessions_used, remaining_sessions")
        .order("created_at", { ascending: false })
    );

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

oneTimeCheckbox.addEventListener("change", () => {
  const isOneTime = oneTimeCheckbox.checked;
  memberCurrentRemainingField.style.display = isOneTime ? "none" : "block";
  memberNameInput.placeholder = isOneTime
    ? "直接輸入姓名即可（單次消費，不建檔）"
    : "輸入姓名以搜尋既有會員";
  mainMatchedMemberId = null;
  memberCurrentRemainingInput.value = "";
});

editOneTimeCheckbox.addEventListener("change", () => {
  const isOneTime = editOneTimeCheckbox.checked;
  editMemberCurrentRemainingField.style.display = isOneTime ? "none" : "block";
  editMatchedMemberId = null;
  editMemberCurrentRemainingInput.value = "";
});

memberNameInput.addEventListener("input", () => {
  if (oneTimeCheckbox.checked) return;

  const member = membersByName.get(memberNameInput.value.trim());

  if (!member) {
    mainMatchedMemberId = null;
    memberCurrentRemainingInput.value = "";
    return;
  }

  memberCurrentRemainingInput.value = member.remaining_sessions;
  if (mainMatchedMemberId !== member.id) {
    mainMatchedMemberId = member.id;
    unitPriceInput.value = member.unit_price;
  }
});

editMemberInput.addEventListener("input", () => {
  if (editOneTimeCheckbox.checked) return;

  const member = membersByName.get(editMemberInput.value.trim());

  if (!member) {
    editMatchedMemberId = null;
    editMemberCurrentRemainingInput.value = "";
    return;
  }

  editMemberCurrentRemainingInput.value = member.remaining_sessions;
  if (editMatchedMemberId !== member.id) {
    editMatchedMemberId = member.id;
    editPriceInput.value = member.unit_price;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageBox);

  let coachName = coachSelect.value;
  if (coachName === NEW_COACH_VALUE) {
    coachName = newCoachNameInput.value.trim();
  }

  const isOneTime = oneTimeCheckbox.checked;
  const memberName = memberNameInput.value.trim();
  const member = isOneTime ? null : membersByName.get(memberName);
  const unitPrice = parseFloat(unitPriceInput.value);
  const sessionsUsed = parseFloat(sessionsUsedInput.value);

  if (!coachName || !memberName || !unitPrice || !sessionsUsed) {
    showMessage(messageBox, "請完整填寫所有欄位", "error");
    return;
  }

  if (!isOneTime && !member) {
    showMessage(messageBox, "查無此會員，請確認姓名，或勾選「單次消費會員」直接登記", "error");
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

  const newRecord = {
    sales_date: salesDateInput.value,
    coach_name: coachName,
    unit_price: unitPrice,
    sessions_used: sessionsUsed
  };

  let newRemainingSessions = 0;

  if (isOneTime) {
    newRecord.member_name = memberName;
    newRecord.member_id = null;
    newRecord.remaining_sessions = 0;
  } else {
    newRecord.member_name = member.name;
    newRecord.member_id = member.id;
    newRemainingSessions = member.remaining_sessions - sessionsUsed;
    newRecord.remaining_sessions = newRemainingSessions;
  }

  const { error } = await window.dbClient.from("sales_records").insert(newRecord);

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = "送出登記";
    showMessage(messageBox, `登記失敗：${error.message}`, "error");
    return;
  }

  if (!isOneTime) {
    const { error: memberUpdateError } = await window.dbClient
      .from("members")
      .update({ remaining_sessions: newRemainingSessions })
      .eq("id", member.id);

    if (memberUpdateError) {
      submitBtn.disabled = false;
      submitBtn.textContent = "送出登記";
      showMessage(messageBox, `登記已送出，但更新會員剩餘堂數失敗：${memberUpdateError.message}`, "error");
      return;
    }
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "送出登記";

  showMessage(messageBox, "登記成功！", "success");
  memberNameInput.value = "";
  memberCurrentRemainingInput.value = "";
  mainMatchedMemberId = null;
  unitPriceInput.value = "";
  sessionsUsedInput.value = "";

  if (coachSelect.value === NEW_COACH_VALUE) {
    newCoachNameInput.value = "";
    newCoachField.style.display = "none";
    await loadCoaches();
    coachSelect.value = coachName;
  }

  await loadRecentRecords();
  await loadMembers();
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
    await loadMembers();
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

  const isOneTime = editOneTimeCheckbox.checked;
  const memberName = editMemberInput.value.trim();
  const member = isOneTime ? null : membersByName.get(memberName);

  const updated = {
    sales_date: editDateInput.value,
    coach_name: editCoachSelect.value,
    member_name: memberName,
    unit_price: parseFloat(editPriceInput.value),
    sessions_used: parseFloat(editSessionsInput.value)
  };

  if (!updated.coach_name || !updated.member_name || !updated.unit_price || !updated.sessions_used) {
    showMessage(editMessageBox, "請完整填寫所有欄位", "error");
    return;
  }

  if (!isOneTime && !member) {
    showMessage(editMessageBox, "查無此會員，請確認姓名，或勾選「單次消費會員」直接儲存", "error");
    return;
  }

  if (isOneTime) {
    updated.member_id = null;
  } else {
    updated.member_id = member.id;
    updated.member_name = member.name;
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
  await loadMembers();
});

salesDateInput.value = localDateISO();
window.requireAuth(() => {
  loadCoaches();
  loadRecentRecords();
  loadMembers();
});
