# My Checklist

A simple, single-page checklist app. No install or build step: it's plain HTML, CSS and JavaScript.

## How to use it

Open `checklist.html` in any web browser.

- **Add** an item by typing in the box and pressing Enter (or clicking **+**).
- **Check off** an item with its checkbox. The progress bar shows how much is done.
- **Edit** an item by double-clicking its text or clicking ✎. Enter or clicking away saves; Escape cancels.
- **Remove** an item with ✕, or remove every checked item at once with **Clear checked items**.
- **Reorder** items by dragging the ⠿ handle, or by selecting the handle and pressing ↑ / ↓.

Your list is saved in your browser (using `localStorage`), so it's still there when you come back. It isn't synced to other browsers or devices.

## Files

| File | What it does |
|---|---|
| `checklist.html` | The page layout |
| `styles.css` | How it looks |
| `script.js` | How it works: adding, editing, reordering and saving items |
