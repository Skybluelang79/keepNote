# KeepNote

A beautiful, fast, local-first note-taking app. Capture thoughts, pin what matters, color-code ideas, and file everything under labels — all in your browser.

Built with **Angular 20**, zero UI dependencies, and installable as a **PWA**.

## Features

- 🗒️ **Notes, archive & trash** — file away or delete notes; trash has full **Undo**
- ✅ **Checklists** — turn any note into a task list with live progress bars
- ⏰ **Reminders** — per-note date/time alerts with browser notifications
- 📌 **Pinned notes** — keep important ideas at the top
- 🎨 **Background colors** — 9-color palette applied to a single note or a whole selection
- 🏷️ **Labels** — organize notes into work, personal, ideas, or custom labels
- 📬 **Sidebar counters** — live counts for notes, archive & trash
- ☑️ **Multi-select** — select several notes and archive, trash, delete or re-color them in one action
- 🔀 **Drag to reorder** — arrange your notes your way
- ✨ **Templates** — instant grocery list, to-do list, or meeting notes
- 🔍 **Instant search** — find anything by title, text, or label
- 🧮 **Note stats** — word/character counts and “edited x ago” in the editor
- 📤 **Export / import** — backup all notes as JSON or Markdown, and restore anytime
- ⌨️ **Keyboard shortcuts** — `N` new note, `/` or `F` search, `Esc` close
- 🌗 **Light & dark themes** — automatic system detection with manual toggle
- 📱 **Installable PWA** — works offline after the first visit
- 💾 **Local-first storage** — autosaves to your browser; no account needed
- ☁️ **Optional cloud sync** — sign in with email/password or Google, notes merge & sync across devices (Firebase)

> 🖼️ Background photo: *hardware black computer photo* by Vecteezy (https://www.vecteezy.com/photo/56009387-hardware-black-computer) — used as the animated app background.

## Development

```bash
npm install          # install dependencies
npm start            # dev server at http://localhost:4200/
npm run build        # production build to dist/keep-note
npm test             # unit tests
```

## Enabling cloud sync (Firebase)

1. Create a free project at https://console.firebase.google.com
2. **Authentication** → Sign-in method → enable **Email/Password** and **Google**
3. **Firestore Database** → Create database (production or test mode; start with test mode to try it out)
4. Add a web app (**Project settings → Your apps → Web**) and copy the SDK config
5. Paste the values into `src/environments/environment.ts`:
   ```ts
   export const environment = {
     production: false,
     firebase: {
       apiKey: 'AIza...',
       authDomain: 'your-project.firebaseapp.com',
       projectId: 'your-project',
       appId: '1:...:web:...',
     },
   };
   ```
6. **Firestore → Rules** — lock data to each user:
   ```
   match /users/{userId}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```
7. Rebuild/restart — the account button turns into a live sync menu.

Sync works over a per-user doc (`users/{uid}/data/main`), merges by last-write-wins per note, supports offline-first via Firestore's local cache, and degrades gracefully to local-only mode when no config is present.

## Deployment

- **GitHub Pages (repo included)** — push to `main`; the workflow in
  `.github/workflows/deploy-pages.yml` builds and publishes automatically. Enable it once in:
  **Settings → Pages → Source: "GitHub Actions**. Live at `https://<you>.github.io/keepNote/`.
- **Netlify / Vercel** — build command `npm run build`, output dir `dist/keep-note/browser`
  (hosts at the site root, no base-path needed).
- **Firebase Hosting** — pairs well with the sync feature:
  ```bash
  npm i -g firebase-tools
  firebase init hosting       # set "public" to dist/keep-note/browser, SPA rewrite
  npm run build && firebase deploy
  ```

The app is base-path agnostic: assets, manifest, service worker and notifications use relative
URLs, so it works both at a domain root and under a sub-path like `/keepNote/`.

## Project structure

```
src/
├── app/
│   ├── components/
│   │   ├── app-header/       # top bar: brand, search, theme toggle, account/sync menu
│   │   ├── app-sidebar/      # navigation: notes / archive / trash / labels + counts + ad slot
│   │   ├── app-icon/         # inline SVG icon component (no icon-dependency)
│   │   ├── color-picker/     # reusable note-color palette
│   │   ├── note-creator/     # "take a note…" composer + templates
│   │   ├── note-card/        # single note in the masonry grid (checklist, drag, select)
│   │   ├── notes-view/       # masonry grid, batch bar, empty states
│   │   ├── note-dialog/      # inline editor: checklist, reminders, labels, export
│   │   ├── auth-dialog/      # sign in / create account / Google + sync status
│   │   └── ad-slot/          # placeholder advertising space (sidebar box + leaderboard)
│   ├── environments/         # Firebase config (fill in your keys here)
│   ├── models/               # Note, checklist parsing, colors, templates
│   ├── services/             # state (signals), localStorage, theme, sync (Firebase)
│   └── app.component.*       # app shell, shortcuts, reminder timer
├── index.html
└── main.ts
```

## License

MIT