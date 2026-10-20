// ---------- Data ----------
// All lists are saved together as { lists: [{ id, name, items, updated }], current: id-of-open-list }
// `updated` is when the list was last changed (milliseconds since 1970), shown as "Updated 5 minutes ago".
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

// ---------- "Updated 5 minutes ago" ----------
const updatedEl = document.getElementById("updated");

function showUpdated() {
  const t = currentList().updated;
  updatedEl.textContent = t ? "Updated " + timeAgo(t) : "";
}

// Turns a time into words like "just now", "5 minutes ago", "yesterday" or "on 14 Oct"
function timeAgo(t) {
  const words = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return words.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return words.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return words.format(-days, "day");
  return "on " + new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

setInterval(showUpdated, 60000); // re-word it every minute (60,000 ms)

// ---------- Save to the browser ----------
// `changed` is false when nothing in the list itself changed (e.g. just switching lists),
// so the "Updated …" time stays put.
function save(changed = true) {
  currentList().items = items;
  if (changed) currentList().updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify({ lists, current: currentId })); } catch (e) {}
  showUpdated();
}

// ---------- Undo ----------
// Before anything is removed, a copy of all the lists is kept so "Undo" can put it back.
function withUndo(message, action) {
  const before = JSON.stringify({ lists, current: currentId });
  action();
  showToast(message, () => {
    const copy = JSON.parse(before);
    lists = copy.lists;
    currentId = copy.current;
    items = currentList().items;
    showTitle(currentList().name);
    save(false); render();
  });
}

// The little message that pops up at the bottom, e.g. "Removed "Eggs" · Undo"
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message, undo) {
  toast.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(text);
  if (undo) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Undo";
    btn.onclick = () => { hideToast(); undo(); };
    toast.append(btn);
  }
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000); // disappears after 6 seconds
}

function hideToast() {
  toast.classList.remove("show");
}

// ---------- Redraw the list from `items` ----------
function render() {
  list.innerHTML = "";
  items.forEach((item, i) => {
    const li = document.createElement("li");
    if (item.done) li.classList.add("done");
    if (i === justAdded) li.classList.add("new");
    li.dataset.index = i; // remember which item this row is, for dragging
    li.onpointerdown = (e) => startSwipe(e, li, i);

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
    del.onclick = () => removeItem(i);

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
  renderTabs(false); // keep the counts on the tabs up to date
}

function removeItem(i) {
  withUndo(`Removed "${items[i].text}"`, () => {
    items.splice(i, 1);
    save(); render();
  });
}

// ---------- Swipe left to remove (touch screens) ----------
function startSwipe(e, li, i) {
  if (e.pointerType === "mouse" || li.classList.contains("editing") || e.target.closest(".handle")) return;
  const startX = e.clientX, startY = e.clientY;
  let swiping = false;

  function move(ev) {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if (!swiping) {
      if (dx < -10 && Math.abs(dx) > Math.abs(dy)) { // moving left more than up/down: it's a swipe
        swiping = true;
        li.classList.add("swiping");
      } else if (Math.abs(dy) > 10 || dx > 10) {
        return stop();                               // it's a scroll (or a swipe the wrong way)
      } else {
        return;
      }
    }
    const x = Math.min(0, dx);
    li.style.transform = `translateX(${x}px)`;
    li.style.opacity = Math.max(0.3, 1 + x / li.offsetWidth);
  }

  function up(ev) {
    const farEnough = swiping && ev.clientX - startX < -li.offsetWidth * 0.35; // over about a third of the way
    stop();
    if (farEnough) removeItem(i);
  }

  function stop() {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", stop);
    li.classList.remove("swiping");
    li.style.transform = li.style.opacity = ""; // slides back if it wasn't removed
  }

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", stop);
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
    const changed = keep && newText && newText !== item.text;
    if (changed) item.text = newText; // an empty box keeps the old text
    save(changed); render();
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
    const moved = newOrder.some((item, n) => item !== items[n]);
    items = newOrder;
    save(moved); render();
  };
}

// ---------- Switching between lists ----------
// A row of tabs, one per list (with how many are done, e.g. "2/5"), plus "+ New list" at the end.
const tabs = document.getElementById("tabs");
let ignoreTabClick = false; // set just after dragging a tab, so letting go doesn't also switch lists

function renderTabs(scrollToOpen = true) {
  const scroll = tabs.scrollLeft;
  tabs.innerHTML = "";
  lists.forEach(l => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.dataset.id = l.id;
    tab.title = l.name;

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = l.name;
    tab.append(name);

    if (l.items.length) {
      const count = document.createElement("span");
      count.className = "tab-count";
      count.textContent = `${l.items.filter(x => x.done).length}/${l.items.length}`;
      tab.append(count);
    }

    if (l.id === currentId) {
      tab.classList.add("active");
      tab.setAttribute("aria-current", "true");
    }
    tab.onclick = () => { if (!ignoreTabClick) switchTo(l.id); };
    tab.onpointerdown = (e) => startTabDrag(e, tab);
    tabs.append(tab);
  });

  const add = document.createElement("button");
  add.type = "button";
  add.className = "tab new-tab";
  add.textContent = "+ New list";
  add.onclick = newList;
  tabs.append(add);

  if (scrollToOpen) {
    // Scroll the open list's tab into view if there are too many to fit
    const active = tabs.querySelector(".active");
    tabs.scrollLeft = Math.max(0, active.offsetLeft - tabs.offsetLeft - 40);
  } else {
    tabs.scrollLeft = scroll;
  }
}

// ---------- Reorder lists by dragging their tabs ----------
// Touch screens: press and hold a tab, then drag. Mouse: just drag it.
function startTabDrag(e, tab) {
  if (e.button !== 0) return;
  const touch = e.pointerType !== "mouse";
  const startX = e.clientX, startY = e.clientY;
  let dragging = false;
  const holdTimer = touch ? setTimeout(begin, 400) : null; // a 0.4 second hold starts the drag

  function begin() {
    dragging = true;
    tab.classList.add("dragging");
    tabs.classList.add("reordering");
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function move(ev) {
    if (!dragging) {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (touch && dist > 8) stop();        // moved before the hold finished: it's a scroll
      if (!touch && dist > 5) begin();
      return;
    }
    const middle = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    let next = tab.nextElementSibling;
    let prev = tab.previousElementSibling;
    while (next && !next.classList.contains("new-tab") && ev.clientX > middle(next)) {
      tab.before(next);
      next = tab.nextElementSibling;
    }
    while (prev && ev.clientX < middle(prev)) {
      tab.after(prev);
      prev = tab.previousElementSibling;
    }
  }

  function up() {
    const wasDragging = dragging;
    stop();
    if (!wasDragging) return;
    const order = [...tabs.querySelectorAll(".tab[data-id]")].map(t => t.dataset.id);
    lists.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    ignoreTabClick = true;
    setTimeout(() => ignoreTabClick = false, 50);
    save(false); renderTabs(false);
  }

  function stop() {
    clearTimeout(holdTimer);
    dragging = false;
    tab.classList.remove("dragging");
    tabs.classList.remove("reordering");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
  }

  function cancel() {
    stop();
    renderTabs(false); // put the tabs back how they were
  }

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", cancel);
}

// While a tab is being dragged, stop the finger from scrolling the tab row instead
tabs.addEventListener("touchmove", (e) => {
  if (tabs.classList.contains("reordering")) e.preventDefault();
}, { passive: false });

function switchTo(id) {
  currentId = id;
  items = currentList().items;
  showTitle(currentList().name);
  save(false); render();
}

// Makes an empty list, opens it, and lets you type its name straight away
function newList() {
  const l = { id: newId(), name: "New list", items: [], updated: Date.now() };
  lists.push(l);
  switchTo(l.id);
  titleEl.onclick();
}

// Delete the open list. There's always at least one list.
document.getElementById("deleteList").onclick = () => {
  const l = currentList();
  withUndo(`Deleted "${l.name}"`, () => {
    const i = lists.indexOf(l);
    lists.splice(i, 1);
    if (!lists.length) lists.push({ id: newId(), name: "Checklist", items: [] });
    switchTo(lists[Math.max(0, i - 1)].id);
  });
};

// ---------- List name ----------
// Click the title to rename the open list. Enter or clicking away saves, Escape cancels.
const titleEl = document.getElementById("title");

function showTitle(name) {
  titleEl.textContent = name;
  document.title = name; // the browser tab shows it too
  renderTabs();
  showUpdated();
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
    if (keep && name && name !== currentList().name) {
      currentList().name = name;
      save();
      showTitle(name);
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
  const n = items.filter(x => x.done).length;
  withUndo(`Cleared ${n} checked item${n === 1 ? "" : "s"}`, () => {
    items = items.filter(x => !x.done);
    save(); render();
  });
};

// ---------- Share ----------
// Sends the open list as text, e.g. by Messages or email. Where sharing isn't available
// (most computers), it's copied so you can paste it instead.
function listAsText(l) {
  const lines = l.items.map(x => (x.done ? "☑ " : "☐ ") + x.text);
  return l.name + "\n\n" + (lines.length ? lines.join("\n") : "(nothing on it yet)");
}

document.getElementById("shareBtn").onclick = async () => {
  const text = listAsText(currentList());
  if (navigator.share) {
    try { await navigator.share({ text }); } catch (e) {} // closing the share sheet is fine
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("List copied – paste it into a message");
  } catch (e) {
    showToast("Sharing isn't available here");
  }
};

// ---------- ⋯ menu ----------
const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menuBtn");

function closeMenu() {
  menu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.onclick = () => {
  const opening = menu.hidden;
  menu.hidden = !opening;
  menuBtn.setAttribute("aria-expanded", String(opening));
};

// Clicking anywhere else, or pressing Escape, closes the menu
document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) { closeMenu(); menuBtn.focus(); }
});

menu.onclick = (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  closeMenu();
  menuActions[button.dataset.action]();
};

const menuActions = {
  // Untick everything, to reuse the list (e.g. a weekly shop or packing list)
  untick() {
    if (!items.some(x => x.done)) return showToast("Nothing is ticked");
    withUndo("Unticked everything", () => {
      items.forEach(x => x.done = false);
      save(); render();
    });
  },

  // Copy the open list, e.g. to use one as a template
  duplicate() {
    const l = currentList();
    const copy = { id: newId(), name: l.name + " copy", items: l.items.map(x => ({ ...x })), updated: Date.now() };
    lists.splice(lists.indexOf(l) + 1, 0, copy); // put it right after the original
    switchTo(copy.id);
    showToast(`Made "${copy.name}"`);
  },

  backup,
  restore() { document.getElementById("restoreFile").click(); }
};

// ---------- Back up and restore ----------
// A backup is a small file with all your lists in it. On a phone it opens the share sheet
// (choose "Save to Files"); on a computer it downloads.
async function backup() {
  const data = JSON.stringify({ app: "Checklist", saved: new Date().toISOString(), lists }, null, 2);
  const name = `checklist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: "application/json" });

  const isPhone = matchMedia("(pointer: coarse)").matches;
  if (isPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (e) {}
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast("Backup saved to your downloads");
}

document.getElementById("restoreFile").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = ""; // so picking the same file again still works
  if (!file) return;

  let restored;
  try {
    const data = JSON.parse(await file.text());
    // Only keep what we expect, so a wrong or damaged file can't break the app
    restored = data.lists.map(l => ({
      id: newId(),
      name: String(l.name || "Checklist"),
      items: l.items.map(x => ({ text: String(x.text), done: !!x.done })),
      updated: Number(l.updated) || undefined
    }));
    if (!restored.length) throw new Error("no lists");
  } catch (err) {
    return showToast("That file isn't a Checklist backup");
  }

  const n = restored.length;
  if (!confirm(`Replace your lists with the ${n} list${n === 1 ? "" : "s"} in this backup?`)) return;
  withUndo(`Restored ${n} list${n === 1 ? "" : "s"}`, () => {
    lists = restored;
    switchTo(lists[0].id);
  });
};

// ---------- Help ----------
// The "i" button opens the how-to box. "Got it", Escape, or tapping outside closes it.
const help = document.getElementById("help");
document.getElementById("helpBtn").onclick = () => {
  help.showModal();
  help.scrollTop = 0; // start at the top, not scrolled down to the "Got it" button
};
help.onclick = (e) => {
  // Close if the tap landed on the dimmed area outside the box
  const r = help.getBoundingClientRect();
  const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (e.target === help && outside) help.close();
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
