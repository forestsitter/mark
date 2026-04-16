# Mark — Personal Bookmark Manager

A self-hosted, zero-backend bookmark manager. All data lives in your browser's `localStorage`.

## Features
- Save, tag, star, and search bookmarks
- Grid and list views
- Unread tracking
- Bookmarklet for one-click saving from any page
- PWA — installable to your home screen / taskbar
- Works offline after first load
- Import/export as JSON

## Deploy (3 options)

### Option A: GitHub Pages (free, recommended)
1. Create a new repo on GitHub (e.g. `mark`)
2. Upload `index.html`, `sw.js`, `manifest.json`
3. Go to Settings → Pages → Deploy from branch `main`
4. Your app is live at `https://yourusername.github.io/mark`

### Option B: Netlify Drop (free, instant)
1. Go to https://app.netlify.com/drop
2. Drag the folder containing all 3 files
3. Done — get a live URL immediately

### Option C: Cloudflare Pages (free)
1. Push files to a GitHub repo
2. Connect it in Cloudflare Pages dashboard
3. Deploys automatically on every push

## Bookmarklet Setup
Once deployed, visit your app. The bookmarklet link is shown in the green banner at the top.
Drag it to your browser's bookmarks bar. Click it on any page to save that page to Mark.

## Data & Sync
- All bookmarks are stored in `localStorage` in the browser where you use the app.
- To move data between browsers: use the export button (coming in v2) and re-import.
- For sync across devices, consider hosting on one URL and using the bookmarklet from all devices
  (each device has its own localStorage, but the add flow via bookmarklet works everywhere).

## Keyboard Shortcuts
- `n` — New bookmark
- `Cmd/Ctrl + K` — Focus search
- `Escape` — Close modal

## Roadmap ideas
- [ ] Export to Netscape HTML format (universal bookmark import)
- [ ] Import from Raindrop/Pinboard JSON
- [ ] Browser extension (skip the bookmarklet)
- [ ] Optional Supabase/PocketBase backend for sync
