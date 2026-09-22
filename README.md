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

## Development

```bash
npm install          # install dependencies
npm start            # dev server at http://localhost:4200/
npm run build        # production build to dist/keep-note
npm test             # unit tests
```

## Project structure

```
src/
├── app/
│   ├── components/
│   │   ├── app-header/       # top bar: brand, search, theme toggle + data menu
│   │   ├── app-sidebar/      # navigation: notes / archive / trash / labels + counts
│   │   ├── app-icon/         # inline SVG icon component (no icon-dependency)
│   │   ├── color-picker/     # reusable note-color palette
│   │   ├── note-creator/     # "take a note…" composer + templates
│   │   ├── note-card/        # single note in the masonry grid (checklist, drag, select)
│   │   ├── notes-view/       # masonry grid, batch bar, empty states
│   │   └── note-dialog/      # inline editor: checklist, reminders, labels, export
│   ├── models/               # Note, checklist parsing, colors, templates
│   ├── services/             # state (signals), localStorage, theme
│   └── app.component.*       # app shell, shortcuts, reminder timer
├── index.html
└── main.ts
```

## License

MIT