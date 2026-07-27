const addMemberForm = document.getElementById("add-member-form");
const newMemberNameInput = document.getElementById("new-member-name");
const newMemberPriceInput = document.getElementById("new-member-price");
const newMemberSessionsInput = document.getElementById("new-member-sessions");
const newMemberOneTimeInput = document.getElementById("new-member-one-time");
const addMemberBtn = document.getElementById("add-member-btn");
const addMemberMessage = document.getElementById("add-member-message");

const memberListBody = document.getElementById("member-list");

const editMemberCard = document.getElementById("edit-member-card");
const editMemberForm = document.getElementById("edit-member-form");
const editMemberNameInput = document.getElementById("edit-member-name");
const editMemberPriceInput = document.getElementById("edit-member-price");
const editMemberSessionsInput = document.getElementById("edit-member-sessions");
const editMemberOneTimeInput = document.getElementById("edit-member-one-time");
const editMemberCancelBtn = document.getElementById("edit-member-cancel-btn");
const editMemberSaveBtn = document.getElementById("edit-member-save-btn");
const editMemberMessage = document.getElementById("edit-member-message");

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
      <td>${m.is_one_time ? "是" : ""}</td>
      <td>${formatDateTime(m.updated_at)}</td>
      <td class="row-actions">
        <button type="button" class="edit-btn" data-id="${m.id}">編輯</button>
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
  editMemberOneTimeInput.checked = !!member.is_one_time;

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
    memberListBody.innerHTML = '<tr class="empty-row"><td colspan="5">載入失敗，請重新整理頁面</td></tr>';
    return;
  }

  try {
    const { data, error } = await withTimeout(
      window.dbClient
        .from("members")
        .select("id, name, unit_price, remaining_sessions, is_one_time, updated_at")
        .order("name")
    );

    if (error) throw error;

    membersById = new Map(data.map((m) => [m.id, m]));

    if (data.length === 0) {
      memberListBody.innerHTML = '<tr class="empty-row"><td colspan="5">尚無會員</td></tr>';
      return;
    }

    memberListBody.innerHTML = data.map(viewRowHtml).join("");
    if (editingMemberId) highlightEditingRow();
  } catch (err) {
    memberListBody.innerHTML = `<tr class="empty-row"><td colspan="5">載入失敗：${err.message}，請重新整理頁面</td></tr>`;
  }
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
    is_one_time: newMemberOneTimeInput.checked
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

memberListBody.addEventListener("click", (event) => {
  const target = event.target;
  const id = target.dataset.id;
  if (!id || !target.classList.contains("edit-btn")) return;

  const member = membersById.get(id);
  openEditForm(member);
});

editMemberCancelBtn.addEventListener("click", () => {
  closeEditForm();
});

editMemberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(editMemberMessage);

  if (!editingMemberId) return;

  const updated = {
    name: editMemberNameInput.value.trim(),
    unit_price: parseFloat(editMemberPriceInput.value),
    remaining_sessions: parseFloat(editMemberSessionsInput.value),
    is_one_time: editMemberOneTimeInput.checked
  };

  if (!updated.name || !updated.unit_price || isNaN(updated.remaining_sessions)) {
    showMessage(editMemberMessage, "請完整填寫所有欄位", "error");
    return;
  }

  editMemberSaveBtn.disabled = true;
  editMemberSaveBtn.textContent = "儲存中...";

  const { error } = await window.dbClient.from("members").update(updated).eq("id", editingMemberId);

  editMemberSaveBtn.disabled = false;
  editMemberSaveBtn.textContent = "儲存";

  if (error) {
    const message = error.code === "23505" ? "已有相同姓名的會員" : error.message;
    showMessage(editMemberMessage, `更新失敗：${message}`, "error");
    return;
  }

  closeEditForm();
  await loadMembers();
});

window.requireAuth(() => {
  loadMembers();
});
