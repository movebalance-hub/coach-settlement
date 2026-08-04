const addMemberForm = document.getElementById("add-member-form");
const newMemberNameInput = document.getElementById("new-member-name");
const newMemberPriceInput = document.getElementById("new-member-price");
const newMemberSessionsInput = document.getElementById("new-member-sessions");
const newMemberCoachInput = document.getElementById("new-member-coach");
const addMemberBtn = document.getElementById("add-member-btn");
const addMemberMessage = document.getElementById("add-member-message");

const memberListBody = document.getElementById("member-list");

const editMemberCard = document.getElementById("edit-member-card");
const editMemberForm = document.getElementById("edit-member-form");
const editMemberNameInput = document.getElementById("edit-member-name");
const editMemberPriceInput = document.getElementById("edit-member-price");
const editMemberSessionsInput = document.getElementById("edit-member-sessions");
const editMemberCoachInput = document.getElementById("edit-member-coach");
const editMemberCancelBtn = document.getElementById("edit-member-cancel-btn");
const editMemberSaveBtn = document.getElementById("edit-member-save-btn");
const editMemberMessage = document.getElementById("edit-member-message");
const memberListMessage = document.getElementById("member-list-message");

let membersById = new Map();
let editingMemberId = null;

function formatDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function viewRowHtml(m) {
  return `
    <tr data-id="${m.id}">
      <td>${escapeHtml(m.name)}</td>
      <td>${m.unit_price}</td>
      <td>${m.remaining_sessions}</td>
      <td class="${coachColorClass(m.primary_coach)}">${escapeHtml(m.primary_coach || "")}</td>
      <td>${m.is_one_time ? "是" : ""}</td>
      <td>${formatDateTime(m.updated_at)}</td>
      <td class="row-actions">
        <button type="button" class="edit-btn" data-id="${m.id}">編輯</button>
        <button type="button" class="delete-btn" data-id="${m.id}">刪除</button>
      </td>
    </tr>`;
}

function highlightEditingRow() {
  for (const tr of memberListBody.querySelectorAll("tr")) {
    tr.classList.toggle("editing-row", tr.dataset.id === editingMemberId);
  }
}

function openEditForm(member) {
  editingMemberId = member.id;
  editMemberNameInput.value = member.name;
  editMemberPriceInput.value = member.unit_price;
  editMemberSessionsInput.value = member.remaining_sessions;
  editMemberCoachInput.value = member.primary_coach || "";

  clearMessage(editMemberMessage);
  editMemberCard.style.display = "block";
  highlightEditingRow();
  editMemberCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditForm() {
  editingMemberId = null;
  editMemberCard.style.display = "none";
  highlightEditingRow();
}

async function loadMembers() {
  if (!window.dbClient) {
    memberListBody.innerHTML = '<tr class="empty-row"><td colspan="6">載入失敗，請重新整理頁面</td></tr>';
    return;
  }

  try {
    const { data, error } = await withTimeout(
      window.dbClient
        .from("members")
        .select("id, name, unit_price, remaining_sessions, primary_coach, is_one_time, updated_at")
        .order("primary_coach", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true })
    );

    if (error) throw error;

    membersById = new Map(data.map((m) => [m.id, m]));

    if (data.length === 0) {
      memberListBody.innerHTML = '<tr class="empty-row"><td colspan="7">尚無會員</td></tr>';
      return;
    }

    memberListBody.innerHTML = data.map(viewRowHtml).join("");
    if (editingMemberId) highlightEditingRow();
  } catch (err) {
    memberListBody.innerHTML = `<tr class="empty-row"><td colspan="7">載入失敗：${err.message}，請重新整理頁面</td></tr>`;
  }
}

async function countMemberSalesRecords(memberId) {
  const { count, error } = await withTimeout(
    window.dbClient
      .from("sales_records")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
  );

  if (error) throw error;
  return count;
}

addMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(addMemberMessage);

  const name = newMemberNameInput.value.trim();
  const unitPrice = parseFloat(newMemberPriceInput.value);
  const remainingSessions = parseFloat(newMemberSessionsInput.value);

  if (!name || !unitPrice || isNaN(remainingSessions)) {
    showMessage(addMemberMessage, "請完整填寫所有欄位", "error");
    return;
  }

  addMemberBtn.disabled = true;
  addMemberBtn.textContent = "新增中...";

  const { error } = await window.dbClient.from("members").insert({
    name,
    unit_price: unitPrice,
    remaining_sessions: remainingSessions,
    primary_coach: newMemberCoachInput.value || null
  });

  addMemberBtn.disabled = false;
  addMemberBtn.textContent = "新增會員";

  if (error) {
    const message = error.code === "23505" ? "已有相同姓名的會員" : error.message;
    showMessage(addMemberMessage, `新增失敗：${message}`, "error");
    return;
  }

  showMessage(addMemberMessage, "新增成功！", "success");
  addMemberForm.reset();
  await loadMembers();
});

memberListBody.addEventListener("click", async (event) => {
  const target = event.target;
  const id = target.dataset.id;
  if (!id) return;

  const member = membersById.get(id);

  if (target.classList.contains("edit-btn")) {
    openEditForm(member);
    return;
  }

  if (target.classList.contains("delete-btn")) {
    clearMessage(memberListMessage);

    let recordCount = 0;
    try {
      recordCount = await countMemberSalesRecords(id);
    } catch (err) {
      showMessage(memberListMessage, `刪除前確認歷史紀錄失敗：${err.message}，請重新整理頁面再試一次`, "error");
      return;
    }

    const confirmMessage =
      recordCount > 0
        ? `會員「${member.name}」有 ${recordCount} 筆歷史銷課紀錄。刪除會員後，這些紀錄仍會保留，但會員姓名以外的關聯（例如剩餘堂數自動查詢）將會失效。此動作無法復原，確定要刪除嗎？`
        : `確定要刪除會員「${member.name}」嗎？此動作無法復原。`;

    if (!confirm(confirmMessage)) return;

    const { error } = await window.dbClient.from("members").delete().eq("id", id);
    if (error) {
      showMessage(memberListMessage, `刪除失敗：${error.message}`, "error");
      return;
    }

    if (id === editingMemberId) closeEditForm();
    showMessage(memberListMessage, `已刪除會員「${member.name}」`, "success");
    await loadMembers();
  }
});

editMemberCancelBtn.addEventListener("click", () => {
  closeEditForm();
});

async function syncLatestSalesRecordRemaining(memberId, remainingSessions) {
  const { data: latestRecords, error: latestError } = await window.dbClient
    .from("sales_records")
    .select("id")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestError) {
    console.error("查詢最新銷課紀錄失敗：", latestError.message);
    return;
  }
  if (!latestRecords || latestRecords.length === 0) return;

  const { error: syncError } = await window.dbClient
    .from("sales_records")
    .update({ remaining_sessions: remainingSessions })
    .eq("id", latestRecords[0].id);

  if (syncError) {
    console.error("同步最新銷課紀錄的剩餘堂數失敗：", syncError.message);
  }
}

editMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(editMemberMessage);

  if (!editingMemberId) return;

  const previousMember = membersById.get(editingMemberId);

  const updated = {
    name: editMemberNameInput.value.trim(),
    unit_price: parseFloat(editMemberPriceInput.value),
    remaining_sessions: parseFloat(editMemberSessionsInput.value),
    primary_coach: editMemberCoachInput.value || null
  };

  if (!updated.name || !updated.unit_price || isNaN(updated.remaining_sessions)) {
    showMessage(editMemberMessage, "請完整填寫所有欄位", "error");
    return;
  }

  editMemberSaveBtn.disabled = true;
  editMemberSaveBtn.textContent = "儲存中...";

  const { error } = await window.dbClient.from("members").update(updated).eq("id", editingMemberId);

  if (error) {
    editMemberSaveBtn.disabled = false;
    editMemberSaveBtn.textContent = "儲存";
    const message = error.code === "23505" ? "已有相同姓名的會員" : error.message;
    showMessage(editMemberMessage, `更新失敗：${message}`, "error");
    return;
  }

  if (previousMember && Number(previousMember.remaining_sessions) !== updated.remaining_sessions) {
    await syncLatestSalesRecordRemaining(editingMemberId, updated.remaining_sessions);
  }

  editMemberSaveBtn.disabled = false;
  editMemberSaveBtn.textContent = "儲存";

  closeEditForm();
  await loadMembers();
});

window.requireAuth(() => {
  loadMembers();
});
