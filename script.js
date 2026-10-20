// ---------- Data ----------
// All lists are saved together as { lists: [{ id, name, items }], current: id-of-open-list }
const KEY = "checklist-lists";
let saved = null;
try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}

let lists = saved && saved.lists && saved.lists.length ? saved.lists : null;
if (!lists) {
  // First time with multiple lists: bring over the single list saved by the older version
  let oldItems = [], oldName = null;
  try {
    oldItems = JSON.parse(localStorage.getItem("my-checklist-items")) || [];
    oldName = localStorage.getItem("my-checklist-title");
  } catch (e) {}
  lists = [{ id: newId(), name: oldName || "Checklist", items: oldItems }];
}

let currentId = saved && lists.some(l => l.id === saved.current) ? saved.current : lists[0].id;
const currentList = () => lists.find(l => l.id === currentId);
let items = currentList().items; // the items of the list that's open

// A unique id for a new list, e.g. "lq3x9k2f7a"
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------- Page elements ----------
const list = document.getElementById("list");
const input = document.getElementById("newItem");
let justAdded = -1; // position of the item just added, so only it animates
let focusHandle = -1; // after moving with the arrow keys, keep that item's handle selected

// Show today's date above the title, e.g. "Tuesday, October 6"
function showDate() {
  document.getElementById("today").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });
}
showDate();                    // show it now
setInterval(showDate, 60000);  // and re-check every minute (60,000 ms), so it changes after midnight

// ---------- Save to the browser ----------
function save() {
  currentList().items = items;
  try { localStorage.setItem(KEY, JSON.stringify({ lists, current: currentId })); } catch (e) {}
}

// ---------- Redraw the list from `items` ----------
function render() {
  list.innerHTML = "";
  items.forEach((item, i) => {
    const li = document.createElement("li");
    if (item.done) li.classList.add("done");
    if (i === justAdded) li.classList.add("new");
    li.dataset.index = i; // remember which item this row is, for dragging

    const handle = document.createElement("button");
    handle.className = "handle";
    handle.title = "Drag to reorder (or select and use ↑ ↓)";
    handle.textContent = "⠿";
    handle.onpointerdown = (e) => startDrag(e, li, handle);
    handle.onkeydown = (e) => {
      if (e.key === "ArrowUp")   { e.preventDefault(); moveItem(i, i - 1); }
      if (e.key === "ArrowDown") { e.preventDefault(); moveItem(i, i + 1); }
    };

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = i + 1;

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = item.done;
    box.setAttribute("aria-label", "Mark as done");
    box.onchange = () => { item.done = box.checked; save(); render(); };

    const text = document.createElement("span");
    text.textContent = item.text;
    text.title = "Double-click to edit";
    text.ondblclick = () => startEdit(li, text, item);

    const edit = document.createElement("button");
    edit.className = "icon-btn edit";
    edit.title = "Edit item";
    edit.textContent = "✎";
    edit.onclick = () => startEdit(li, text, item);

    const del = document.createElement("button");
    del.className = "icon-btn remove";
    del.title = "Remove item";
    del.textContent = "✕";
    del.onclick = () => { items.splice(i, 1); save(); render(); };

    li.append(handle, num, box, text, edit, del);
    list.append(li);
    if (i === focusHandle) handle.focus();
  });
  justAdded = -1;
  focusHandle = -1;

  const done = items.filter(x => x.done).length;
  const percent = items.length ? (done / items.length) * 100 : 0;

  document.getElementById("count").textContent = items.length ? `${done} of ${items.length} done` : "";
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("empty").style.display = items.length ? "none" : "block";
  document.getElementById("clearDone").style.visibility = done ? "visible" : "hidden";
}

// ---------- Edit an item ----------
// Swaps the item's text for a text box. Enter or clicking away saves, Escape cancels.
function startEdit(li, text, item) {
  const box = document.createElement("input");
  box.type = "text";
  box.className = "edit-input";
  box.value = item.text;
  li.classList.add("editing");
  text.replaceWith(box);
  box.focus();
  box.select();

  let finished = false; // stops it saving twice (Enter, then the box losing focus)
  function finish(keep) {
    if (finished) return;
    finished = true;
    const newText = box.value.trim();
    if (keep && newText) item.text = newText; // an empty box keeps the old text
    save(); render();
  }

  box.onkeydown = (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  };
  box.onblur = () => finish(true);
}

// ---------- Reorder: arrow keys ----------
// Takes the item out of position `from` and puts it back in at position `to`.
function moveItem(from, to) {
  if (to < 0 || to >= items.length) return; // already at the top or bottom
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  focusHandle = to;
  save(); render();
}

// ---------- Reorder: dragging ----------
// While you drag, the rows around the dragged row swap places with it.
// When you let go, the new order on screen is copied back into `items`.
function startDrag(e, li, handle) {
  e.preventDefault();
  handle.setPointerCapture(e.pointerId); // keep getting events even if the pointer leaves the handle
  li.classList.add("dragging");
  document.body.classList.add("is-dragging");

  const middle = (row) => {
    const r = row.getBoundingClientRect();
    return r.top + r.height / 2;
  };

  handle.onpointermove = (ev) => {
    let next = li.nextElementSibling;
    let prev = li.previousElementSibling;
    // Dragged below the middle of the row underneath? Move that row up above us.
    while (next && ev.clientY > middle(next)) {
      li.before(next);
      next = li.nextElementSibling;
    }
    // Dragged above the middle of the row on top? Move that row down below us.
    while (prev && ev.clientY < middle(prev)) {
      li.after(prev);
      prev = li.previousElementSibling;
    }
    // Renumber the rows so the numbers follow the drag
    [...list.children].forEach((row, n) => row.querySelector(".num").textContent = n + 1);
  };

  handle.onpointerup = handle.onpointercancel = () => {
    handle.onpointermove = handle.onpointerup = handle.onpointercancel = null;
    document.body.classList.remove("is-dragging");
    const newOrder = [...list.children].map(row => items[row.dataset.index]);
    items = newOrder;
    save(); render();
  };
}

// ---------- Switching between lists ----------
// A row of tabs, one per list, plus "+ New list" at the end.
const tabs = document.getElementById("tabs");

function renderTabs() {
  tabs.innerHTML = "";
  lists.forEach(l => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.textContent = l.name;
    tab.title = l.name;
    if (l.id === currentId) {
      tab.classList.add("active");
      tab.setAttribute("aria-current", "true");
    }
    tab.onclick = () => switchTo(l.id);
    tabs.append(tab);
  });

  const add = document.createElement("button");
  add.type = "button";
  add.className = "tab new-tab";
  add.textContent = "+ New list";
  add.onclick = newList;
  tabs.append(add);

  // Scroll the open list's tab into view if there are too many to fit
  const active = tabs.querySelector(".active");
  tabs.scrollLeft = Math.max(0, active.offsetLeft - tabs.offsetLeft - 40);
}

function switchTo(id) {
  currentId = id;
  items = currentList().items;
  showTitle(currentList().name);
  save(); render();
}

// Makes an empty list, opens it, and lets you type its name straight away
function newList() {
  const l = { id: newId(), name: "New list", items: [] };
  lists.push(l);
  switchTo(l.id);
  titleEl.onclick();
}

// Delete the open list (after asking). There's always at least one list.
document.getElementById("deleteList").onclick = () => {
  const l = currentList();
  if (!confirm(`Delete "${l.name}" and everything on it?`)) return;
  const i = lists.indexOf(l);
  lists.splice(i, 1);
  if (!lists.length) lists.push({ id: newId(), name: "Checklist", items: [] });
  switchTo(lists[Math.max(0, i - 1)].id);
};

// ---------- List name ----------
// Click the title to rename the open list. Enter or clicking away saves, Escape cancels.
const titleEl = document.getElementById("title");

function showTitle(name) {
  titleEl.textContent = name;
  document.title = name; // the browser tab shows it too
  renderTabs();
}

showTitle(currentList().name);

titleEl.onclick = () => {
  const box = document.createElement("input");
  box.type = "text";
  box.className = "title-input";
  box.value = titleEl.textContent;
  titleEl.replaceWith(box);
  box.focus();
  box.select();

  let finished = false; // stops it saving twice (Enter, then the box losing focus)
  function finish(keep) {
    if (finished) return;
    finished = true;
    const name = box.value.trim();
    if (keep && name) {
      currentList().name = name;
      showTitle(name);
      save();
    }
    box.replaceWith(titleEl);
  }

  box.onkeydown = (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  };
  box.onblur = () => finish(true);
};

// ---------- Add an item ----------
document.getElementById("addForm").onsubmit = (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  items.push({ text, done: false });
  justAdded = items.length - 1;
  input.value = "";
  save(); render();
};

// ---------- Remove all checked items ----------
document.getElementById("clearDone").onclick = () => {
  items = items.filter(x => !x.done);
  save(); render();
};

// ---------- Draw once on page load ----------
render();

// ---------- Installable app ----------
// Registers the service worker so the checklist can be installed and used offline.
// (It only runs when the page is served over http(s), e.g. on GitHub Pages, not when opened as a file.)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
