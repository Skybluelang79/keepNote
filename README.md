# KeepNote

[![CI](https://github.com/Skybluelang79/keepNote/actions/workflows/ci.yml/badge.svg)](https://github.com/Skybluelang79/keepNote/actions/workflows/ci.yml)

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
- ✨ **Templates** — seven ready-made layouts: grocery, to-do, meeting, standup, project brief, research, journal
- 🅱️ **Rich text** — bold, italic, underline, strike, code, highlights, links, headings, quotes and lists in every note
- 🖼️ **Background library** — free professional, paper and midnight scenes plus premium studio backgrounds
- 🎨 **Accent themes** — premium-only palettes for buttons, highlights and focus states
- 📢 **Animated ad space** — original 3D-style Fizz Studio and Peak Cream creatives plus rotating premium previews in the sidebar and leaderboard; hidden for premium subscribers
- 👑 **Premium plans** — monthly/yearly subscriptions, note version history on yearly, local demo mode, Stripe billing management, and cloud-synced entitlement
- 🤖 **AI note assistant** — summarize, rewrite, proofread, title, labels, tasks, organize, brainstorm, or ask anything
- 🧠 **Offline AI fallback** — deterministic smart actions still work with no key or deployed function
- 🔑 **Bring-your-own Gemini key** — optional key stored locally in the browser
- ⌘️ **Command palette** — `Ctrl/Cmd + K` for every common action
- 🎯 **Focus mode** — distraction-free editor, `Alt + F` in an open note
- 🔍 **Instant search** — find anything by title, text, or label
- 🧮 **Note stats** — word/character counts and “edited x ago” in the editor
- 📤 **Export / import** — backup all notes as JSON or Markdown, and restore anytime
- ⌨️ **Keyboard shortcuts** — `N` new note, `/` or `F` search, `Ctrl/Cmd + K` commands, `Esc` close
- 🌗 **Light & dark themes** — automatic system detection with manual toggle
- 📱 **Installable PWA** — works offline after the first visit
- 💾 **Local-first storage** — autosaves to your browser; no account needed
- ☁️ **Optional cloud sync** — sign in with email/password or Google, notes merge & sync across devices (Firebase)

> 🖼️ Background photo: *Office hallway* by Nastuh Abootalebi on [Unsplash](https://unsplash.com/photos/yWwob8kwOCk) — free to use under the [Unsplash License](https://unsplash.com/license). It is bundled locally as `public/bg-professional.jpg` and animated with a subtle Ken Burns effect.

## Development

```bash
npm install          # install dependencies
npm start            # dev server at http://localhost:4200/
npm run build        # production build to dist/keep-note
npm test             # unit tests
```

## Rich text formatting

The editor has a formatting toolbar with `B`, `I`, `U`, strikethrough, inline code, highlight,
links, headings, quotes, bullet/numbered lists and dividers. `Ctrl/Cmd + B/I/U` work while editing,
and the **Preview** toggle renders the note using the same Markdown-like tokens used by the toolbar.
Rendering escapes HTML first, so pasted markup is never executed. Notes remain plain text, which
means existing notes, JSON backups and Markdown exports keep working unchanged.

## Premium & backgrounds

Use the **PRO** button in the header, the Data menu, or `Ctrl/Cmd + K` to open premium plans,
background picker and feature list. Monthly ($3) and yearly ($24) plans are handled by
`netlify/functions/checkout.mjs`; billing management uses `netlify/functions/portal.mjs`. On Netlify,
set:

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://your-site.netlify.app/
```

Both paid plans unlock the premium background library, accent themes and an ad-free workspace.
Yearly also unlocks note version history; the editor shows a **Version history** button with the last
12 saved versions and can restore one with a click. Stripe Checkout redirects back to the app with
its session id; the function verifies the session and returns the plan, entitlement, Stripe customer
and subscription ids. That state is stored in `localStorage` and synced in `users/{uid}/data/main`
when signed in. The existing owner-only Firestore rules already cover that field. **Manage billing**
opens the Stripe Customer Portal after a real checkout. If Stripe is not configured, **Try demo**
unlocks all premium features locally without taking a payment.

Premium scenes are original animated assets in `public/` (`bg-fizz.svg`, `bg-peak.svg`,
`bg-aurora.svg`, `bg-marble.svg`, `bg-nebula.svg`, `bg-violet.svg`, `bg-neon.svg`, `bg-amber.svg`).
`bg-fizz.svg` is an abstract glossy 3D soda-bar-style scene and `bg-peak.svg` is an alpine
dairy-studio pour animation, video-like but lightweight. The navy, violet, green and amber scenes
are original motion pieces inspired by free animated background styles. None of the assets use
third-party logos, product packaging or copied advertising footage.

The sidebar box and the leaderboard above the notes grid are live ad slots for every free and demo
user, across notes, archive and trash. They rotate original unbranded 3D-style creatives built from
the bundled premium scenes; clicking a creative applies its background for premium users or opens
the plans dialog for everyone else. Paid subscriptions hide the ads.

## AI assistant

The note editor includes an AI menu with summarize, continue, improve, proofread, shorten, title,
label suggestions, action-item extraction, smart organize, brainstorming, and a free-form
"Ask anything" prompt. Results can be applied, copied, or retried.

AI requests go through `netlify/functions/ai.mjs`. On Netlify, set:

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
```

`FIREBASE_WEB_API_KEY` is the public web API key from `src/environments/environment.ts`; the
function uses it to verify each signed-in user's Firebase ID token against Firebase Auth. The
server `GEMINI_API_KEY` is only used for verified signed-in users. Signed-out users can still use
live AI by pasting a key into **Data → AI settings** (or the command palette's **AI settings**);
that key is saved only in `localStorage` and sent to the function per request. It is never written
to the repository.

Without a signed-in session, a personal key, or a deployed function, the app automatically falls
back to offline smart actions so the AI menu still works locally.

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
6. **Firestore → Rules** — deploy the included owner-only rules, which permit only the app's `users/{uid}/data/main` document:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only firestore:rules
   ```
7. **Authentication → Settings → Authorized domains** — add every host you deploy to (for example your Netlify domain) so sign-in works in production.
8. Rebuild/restart — the account button turns into a live sync menu.

Sync works over a per-user doc (`users/{uid}/data/main`), merges by last-write-wins per note, carries the premium entitlement flag, supports offline-first via Firestore's local cache, and degrades gracefully to local-only mode when no config is present.

> 🔐 The Firebase web config in `src/environments/environment.ts` is public by design; security comes from Firestore rules and authorized domains, not from hiding the `apiKey`. Keep the rules deployed and review them whenever the sync data shape changes.

## Deployment

- **Netlify (primary)** — repo includes `netlify.toml` (build `npm run build`,
  publish `dist/keep-note/browser`, SPA redirect). Deploy manually:
  ```bash
  netlify deploy --prod         # build locally then push dist
  ```
  or connect the GitHub repo in the Netlify dashboard for auto-deploys on push.
- **GitHub Pages** — build with `npm run build -- --base-href=/keepNote/` and publish
  `dist/keep-note/browser`, or
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
firebase.json            # Firestore rules config
firestore.rules          # owner-only sync rules
netlify.toml             # build, publish, SPA + function redirects
netlify/functions/       # AI assistant, Stripe checkout, Stripe billing portal
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
│   │   ├── note-dialog/      # editor: rich text, AI, checklist, reminders, labels, version history, focus mode
│   │   ├── command-palette/  # Ctrl/Cmd+K quick actions
│   │   ├── ai-settings-dialog/# optional browser-local Gemini key
│   │   ├── auth-dialog/      # sign in / create account / Google + sync status
│   │   ├── premium-dialog/   # plans, features, accents, billing management, demo mode and background picker
│   │   └── ad-slot/          # rotating original animated ad creatives (sidebar box + leaderboard)
│   ├── environments/         # Firebase config (fill in your keys here)
│   ├── models/               # Note, note formatting, premium plans, checklist parsing, colors, templates
│   ├── services/             # state, localStorage, theme, sync, premium, AI (Gemini + offline)
│   ├── shared/pipes/         # safe rich-text renderer
│   └── app.component.*       # app shell, shortcuts, ambient FX, reminder timer
├── index.html
└── main.ts
```

## License

MIT