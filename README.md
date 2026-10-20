# Checklist

A simple, single-page checklist app. No install or build step: it's plain HTML, CSS and JavaScript.

## How to use it

Open `checklist.html` in any web browser.

- **Add** an item by typing in the box and pressing Enter (or clicking **+**).
- **Check off** an item with its checkbox. The progress bar shows how much is done.
- **Edit** an item by double-clicking its text or clicking ✎. Enter or clicking away saves; Escape cancels.
- **Remove** an item by swiping it left (on a touch screen) or with ✕, or remove every checked item at once with **Clear checked items**.
- **Reorder** items by dragging the ⠿ handle, or by selecting the handle and pressing ↑ / ↓.
- **Undo** anything you removed with the **Undo** button in the message that pops up at the bottom.

You can keep several lists:

- **Switch** lists with the tabs at the top (swipe them sideways if there are lots). Each tab shows how many items are done, like 2/5.
- **Make** a new list with **+ New list**, then type its name.
- **Rename** the open list by clicking its title.
- **Reorder** lists by dragging their tabs (on a touch screen, press and hold first).
- **Delete** the open list with **Delete list**.

The buttons next to "Updated …" at the top:

- **Share** sends the open list as text, e.g. by Messages or email. On computers without sharing, it copies the list instead.
- **⋯** has **Untick everything** (to reuse a list), **Duplicate this list**, **Back up all lists** and **Restore from a backup**.
- **i** shows how to use the app.

Your lists are saved in your browser (using `localStorage`), so they're still there when you come back. They aren't synced to other browsers or devices; use **⋯ → Back up all lists** to keep a copy or move them.

## Install it as an app

Once the site is online (e.g. on GitHub Pages), you can install it like an app. It gets its own icon, opens full-screen and works offline.

- **iPhone / iPad (Safari):** tap Share → **Add to Home Screen**.
- **Android (Chrome):** tap ⋮ → **Install app** (or **Add to Home screen**).
- **Computer (Chrome / Edge):** click the install icon at the right of the address bar.

To put it on GitHub Pages: in the repo go to **Settings → Pages**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save. The address will be `https://<your-username>.github.io/<repo-name>/`.

On iPhone and iPad the installed app keeps its own list, separate from the one in Safari. On Android and computers they share the same list.

When you change the code, bump `VERSION` at the top of `sw.js` so installed copies refresh their offline copy.

## Files

| File | What it does |
|---|---|
| `checklist.html` | The page layout |
| `styles.css` | How it looks |
| `script.js` | How it works: adding, editing, reordering and saving items |
| `index.html` | Sends visitors from the site's home address to `checklist.html` |
| `manifest.webmanifest` | The app's name, icon and colours, so it can be installed |
| `sw.js` | Keeps a copy of the app so it works offline |
| `icons/` | App icons for home screens and browser tabs |
