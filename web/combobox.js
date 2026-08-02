// 會員姓名下拉選單（取代原生 datalist，才能自訂顯示筆數與依負責教練上色）
function createMemberCombobox(inputEl, listEl) {
  let members = [];
  let activeIndex = -1;
  let suppressOpen = false;

  function matches(member, query) {
    return member.name.toLowerCase().includes(query);
  }

  function render() {
    const query = inputEl.value.trim().toLowerCase();
    const filtered = query ? members.filter((m) => matches(m, query)) : members;

    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="combobox-empty">查無符合的會員</li>';
    } else {
      listEl.innerHTML = filtered
        .map((m, i) => {
          const activeClass = i === activeIndex ? "active" : "";
          const coachClass = coachColorClass(m.primary_coach);
          return `<li data-name="${escapeHtml(m.name)}" class="${activeClass} ${coachClass}">${escapeHtml(m.name)}</li>`;
        })
        .join("");
    }

    listEl.dataset.count = String(filtered.length);
  }

  function open() {
    render();
    listEl.classList.add("open");
  }

  function close() {
    listEl.classList.remove("open");
    activeIndex = -1;
  }

  function selectName(name) {
    inputEl.value = name;
    close();
    suppressOpen = true;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    suppressOpen = false;
  }

  inputEl.addEventListener("focus", open);
  inputEl.addEventListener("input", () => {
    if (suppressOpen) return;
    activeIndex = -1;
    open();
  });

  inputEl.addEventListener("blur", () => {
    // 延遲關閉，讓 mousedown 選取清單項目的事件能先觸發
    setTimeout(close, 150);
  });

  inputEl.addEventListener("keydown", (event) => {
    if (!listEl.classList.contains("open")) return;
    const items = [...listEl.querySelectorAll("li[data-name]")];
    if (items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      render();
      listEl.querySelector("li.active")?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      listEl.querySelector("li.active")?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        event.preventDefault();
        selectName(items[activeIndex].dataset.name);
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  listEl.addEventListener("mousedown", (event) => {
    const li = event.target.closest("li[data-name]");
    if (!li) return;
    event.preventDefault();
    selectName(li.dataset.name);
  });

  return {
    setMembers(newMembers) {
      members = newMembers;
      if (listEl.classList.contains("open")) render();
    }
  };
}
