// ---------- Data ----------
const KEY = "my-checklist-items";
let items = [];
try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { items = []; }

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
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
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

// ---------- Checklist name ----------
// Click the title to rename it. Enter or clicking away saves, Escape cancels.
const TITLE_KEY = "my-checklist-title";
const titleEl = document.getElementById("title");

function showTitle(name) {
  titleEl.textContent = name;
  document.title = name; // the browser tab shows it too
}

try { showTitle(localStorage.getItem(TITLE_KEY) || "My Checklist"); } catch (e) {}

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
      showTitle(name);
      try { localStorage.setItem(TITLE_KEY, name); } catch (e) {}
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
