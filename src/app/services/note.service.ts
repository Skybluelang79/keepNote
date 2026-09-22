import { Injectable, computed, signal } from '@angular/core';
import { Note } from '../models/note.model';
import { addChecklistItem, parseChecklist, setChecklistItem } from '../models/note.model';

export type View = 'notes' | 'archive' | 'trash';
export type SortMode = 'updated' | 'created' | 'az';
export type LayoutMode = 'cards' | 'list';

export interface ToastState {
  message: string;
  actionLabel?: string;
  action?: () => void;
}

const NOTES_KEY = 'keepnote.notes.v1';
const LABELS_KEY = 'keepnote.labels.v1';
const SORT_KEY = 'keepnote.sort.v1';
const LAYOUT_KEY = 'keepnote.layout.v1';

const SEED_NOTES = seedNotes();
const SEED_IDS = new Set(SEED_NOTES.map((n) => n.id));
const SEED_UPDATED = new Map(SEED_NOTES.map((n) => [n.id, n.updatedAt] as const));

/**
 * True when `notes` is exactly the pristine demo seed set (unmodified).
 * Lets sync skip copying demo data over a real cloud account on a fresh device.
 */
export function isSeededOnly(notes: Note[]): boolean {
  if (notes.length !== SEED_NOTES.length) return false;
  return notes.every((n) => SEED_IDS.has(n.id) && SEED_UPDATED.get(n.id) === n.updatedAt);
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) return JSON.parse(raw) as Note[];
  } catch {
    /* ignore */
  }
  return seedNotes();
}

function loadLabels(): string[] {
  try {
    const raw = localStorage.getItem(LABELS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return ['Work', 'Personal', 'Ideas'];
}

function loadSort(): SortMode {
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (v === 'created' || v === 'az') return v;
  } catch {
    /* ignore */
  }
  return 'updated';
}

function loadLayout(): LayoutMode {
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    if (v === 'list') return v;
  } catch {
    /* ignore */
  }
  return 'cards';
}

function bySort(mode: SortMode): (a: Note, b: Note) => number {
  switch (mode) {
    case 'created':
      return (a, b) => b.createdAt - a.createdAt;
    case 'az':
      return (a, b) =>
        (a.title || '').trim().toLowerCase().localeCompare((b.title || '').trim().toLowerCase()) ||
        b.createdAt - a.createdAt;
    default:
      return (a, b) => b.updatedAt - a.updatedAt;
  }
}

function seedNotes(): Note[] {
  const now = Date.now();
  const mins = (m: number) => now - m * 60 * 1000;
  return [
    {
      id: uid(),
      title: 'Welcome to KeepNote 👋',
      content:
        'Click anywhere on the card to edit. Pin an important note, pick a background color, or file it under a label. Everything autosaves to your browser.\n\nTip: press N to create a new note and F or / to search.',
      color: '#fdce5c',
      labels: ['Ideas'],
      pinned: true,
      archived: false,
      trashed: false,
      checklist: false,
      reminder: null,
      createdAt: mins(600),
      updatedAt: mins(10),
    },
    {
      id: uid(),
      title: 'Grocery list',
      content:
        '- [x] Oat milk\n- [x] Avocados x2\n- [ ] Sourdough bread\n- [ ] Espresso beans\n- [ ] Dark chocolate',
      color: '#a7e9a0',
      labels: ['Personal'],
      pinned: false,
      archived: false,
      trashed: false,
      checklist: true,
      reminder: null,
      createdAt: mins(200),
      updatedAt: mins(120),
    },
    {
      id: uid(),
      title: 'Roadmap',
      content: 'Shipping plan:\n- Finish UI polish\n- Add sync & authentication\n- Release the mobile PWA',
      color: '',
      labels: ['Work'],
      pinned: false,
      archived: false,
      trashed: false,
      checklist: false,
      reminder: now + 30 * 60 * 1000,
      createdAt: mins(400),
      updatedAt: mins(42),
    },
    {
      id: uid(),
      title: 'Book club · next pick',
      content: 'Nominees:\n1. Project Hail Mary\n2. Tomorrow, and Tomorrow, and Tomorrow\n3. A Psalm for the Wild-Built',
      color: '#aecbfa',
      labels: ['Personal'],
      pinned: false,
      archived: false,
      trashed: false,
      checklist: false,
      reminder: null,
      createdAt: mins(150),
      updatedAt: mins(5),
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  readonly notes = signal<Note[]>(loadNotes());
  readonly labels = signal<string[]>(loadLabels());
  readonly view = signal<View>('notes');
  readonly query = signal('');
  readonly activeLabel = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly sidebarOpen = signal(false);
  readonly toast = signal<ToastState | null>(null);
  readonly selecting = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly shortcutsOpen = signal(false);
  readonly sortMode = signal<SortMode>(loadSort());
  readonly layout = signal<LayoutMode>(loadLayout());

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly editingNote = computed(() => {
    const id = this.editingId();
    return this.notes().find((n) => n.id === id) ?? null;
  });

  readonly noteCount = computed(() => this.notes().filter((n) => !n.archived && !n.trashed).length);
  readonly archiveCount = computed(() => this.notes().filter((n) => n.archived && !n.trashed).length);
  readonly trashCount = computed(() => this.notes().filter((n) => n.trashed).length);

  private readonly scoped = computed(() => {
    const q = this.query().trim().toLowerCase();
    const label = this.activeLabel();
    const view = this.view();
    return this.notes().filter((n) => {
      const matchesView =
        view === 'archive' ? n.archived && !n.trashed : view === 'trash' ? n.trashed : !n.archived && !n.trashed;
      const matchesLabel = !label || n.labels.includes(label);
      const matchesQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.labels.some((l) => l.toLowerCase().includes(q));
      return matchesView && matchesLabel && matchesQuery;
    });
  });

  readonly visible = computed(() => {
    const list = [...this.scoped()].sort(bySort(this.sortMode()));
    if (this.view() === 'notes' && !this.activeLabel()) {
      return {
        pinned: list.filter((n) => n.pinned),
        others: list.filter((n) => !n.pinned),
      };
    }
    return { pinned: [] as Note[], others: list };
  });

  setSort(mode: SortMode): void {
    this.sortMode.set(mode);
    try {
      localStorage.setItem(SORT_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  setLayout(mode: LayoutMode): void {
    this.layout.set(mode);
    try {
      localStorage.setItem(LAYOUT_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  readonly selectedNotes = computed(() =>
    this.notes().filter((n) => this.selectedIds().includes(n.id)),
  );

  readonly allLabels = computed(() => {
    const set = new Set<string>([...this.labels(), ...this.notes().flatMap((n) => n.labels)]);
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  // --- Lifecycle / reminders ---

  checkReminders(): void {
    const now = Date.now();
    const due = this.notes().filter(
      (n) => n.reminder && n.reminder <= now && !n.trashed,
    );
    for (const note of due) {
      const title = note.title.trim() || 'Untitled note';
      this.showToast(`Reminder · ${title}`, 'View', () => {
        this.openNote(note.id);
      });
      this.notify(title, note.content);
      this.updateNote(note.id, { reminder: null });
    }
  }

  private notify(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'icon.svg' });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification(title, { body, icon: 'icon.svg' });
      });
    }
  }

  requestNotificationPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }

  // --- Mutations ---

  createNote(partial: Partial<Note>): void {
    const note: Note = {
      id: uid(),
      title: '',
      content: '',
      color: '',
      labels: [],
      pinned: false,
      archived: false,
      trashed: false,
      checklist: false,
      reminder: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...partial,
    };
    this.notes.update((list) => [note, ...list]);
    this.persist();
  }

  updateNote(id: string, patch: Partial<Note>): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    );
    this.persist();
  }

  deleteNote(id: string): void {
    this.notes.update((list) => list.filter((n) => n.id !== id));
    this.persist();
  }

  duplicateNote(id: string): void {
    const source = this.notes().find((n) => n.id === id);
    if (!source) return;
    const copy: Note = {
      ...source,
      id: uid(),
      title: `${source.title}`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.notes.update((list) => [copy, ...list]);
    this.persist();
    this.openNote(copy.id);
    this.showToast('Note duplicated');
  }

  togglePin(id: string): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)),
    );
    this.persist();
  }

  archive(id: string): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, archived: true, updatedAt: Date.now() } : n)),
    );
    this.persist();
    this.showToast('Note archived');
  }

  unarchive(id: string): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, archived: false, updatedAt: Date.now() } : n)),
    );
    this.persist();
    this.showToast('Note moved to Notes');
  }

  trash(id: string): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, trashed: true, updatedAt: Date.now() } : n)),
    );
    this.persist();
    this.showToast('Note moved to Trash', 'Undo', () => this.restore(id));
  }

  restore(id: string): void {
    this.notes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, trashed: false, updatedAt: Date.now() } : n)),
    );
    this.persist();
  }

  deleteForever(id: string): void {
    this.notes.update((list) => list.filter((n) => n.id !== id));
    if (this.editingId() === id) this.editingId.set(null);
    this.persist();
    this.showToast('Note deleted permanently');
  }

  emptyTrash(): void {
    this.notes.update((list) => list.filter((n) => !n.trashed));
    this.persist();
    this.showToast('Trash emptied');
  }

  moveNote(draggedId: string, targetId: string): void {
    if (draggedId === targetId) return;
    const list = [...this.notes()];
    const from = list.findIndex((n) => n.id === draggedId);
    const to = list.findIndex((n) => n.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    this.notes.set(list);
    this.persist();
  }

  setReminder(id: string, reminder: number | null): void {
    this.updateNote(id, { reminder });
    if (reminder) this.requestNotificationPermission();
  }

  toggleChecklist(id: string): void {
    const note = this.notes().find((n) => n.id === id);
    if (!note) return;
    this.updateNote(id, { checklist: !note.checklist });
  }

  toggleChecklistItem(id: string, index: number): void {
    const note = this.notes().find((n) => n.id === id);
    if (!note) return;
    const items = parseChecklist(note.content);
    if (!items || !items[index]) return;
    const item = items[index];
    const content = setChecklistItem(note.content, index, {
      text: item.text,
      checked: !item.checked,
    });
    this.updateNote(id, { content });
  }

  updateChecklistItem(id: string, index: number, text: string): void {
    const note = this.notes().find((n) => n.id === id);
    if (!note) return;
    const items = parseChecklist(note.content);
    if (!items || !items[index]) return;
    this.updateNote(id, { content: setChecklistItem(note.content, index, { text, checked: items[index].checked }) });
  }

  addChecklistItem(id: string, text: string): void {
    const note = this.notes().find((n) => n.id === id);
    if (!note) return;
    this.updateNote(id, { content: addChecklistItem(note.content, text) });
  }

  // --- Selection / batch ---

  startSelecting(): void {
    this.selecting.set(true);
    this.selectedIds.set([]);
    this.sidebarOpen.set(false);
  }

  stopSelecting(): void {
    this.selecting.set(false);
    this.selectedIds.set([]);
  }

  toggleSelect(id: string): void {
    this.selectedIds.update((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
  }

  batch(fn: (ids: string[]) => void): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    fn(ids);
    this.persist();
    this.stopSelecting();
  }

  batchArchive(ids: string[]): void {
    this.notes.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, archived: true, updatedAt: Date.now() } : n)),
    );
    this.showToast(`${ids.length} note${ids.length === 1 ? '' : 's'} archived`);
  }

  batchTrash(ids: string[]): void {
    this.notes.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, trashed: true, updatedAt: Date.now() } : n)),
    );
    this.showToast(`${ids.length} note${ids.length === 1 ? '' : 's'} moved to Trash`);
  }

  batchRestore(ids: string[]): void {
    this.notes.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, trashed: false, updatedAt: Date.now() } : n)),
    );
    this.showToast(`${ids.length} note${ids.length === 1 ? '' : 's'} restored`);
  }

  batchDelete(ids: string[]): void {
    this.notes.update((list) => list.filter((n) => !ids.includes(n.id)));
    this.showToast(`${ids.length} note${ids.length === 1 ? '' : 's'} deleted permanently`);
  }

  batchColor(ids: string[], color: string): void {
    this.notes.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, color, updatedAt: Date.now() } : n)),
    );
    this.persist();
  }

  // --- Labels ---

  createLabel(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!this.allLabels().includes(trimmed)) {
      this.labels.update((list) => [...list, trimmed]);
      this.persistLabels();
    }
    this.setActiveLabel(trimmed);
  }

  removeLabel(label: string): void {
    this.labels.update((list) => list.filter((l) => l !== label));
    this.notes.update((list) =>
      list.map((n) => ({ ...n, labels: n.labels.filter((l) => l !== label) })),
    );
    this.persist();
    this.persistLabels();
    if (this.activeLabel() === label) this.setActiveLabel(null);
  }

  setActiveLabel(label: string | null): void {
    this.activeLabel.set(label);
    this.sidebarOpen.set(false);
  }

  setView(view: View): void {
    this.view.set(view);
    this.activeLabel.set(null);
    this.sidebarOpen.set(false);
    this.stopSelecting();
  }

  setQuery(q: string): void {
    this.query.set(q);
  }

  /** Adopt a full snapshot from cloud sync (merged) and persist locally. */
  replaceFromCloud(notes: Note[], labels: string[]): void {
    this.notes.set(notes);
    this.labels.set(labels);
    this.persist();
    this.persistLabels();
  }

  openNote(id: string): void {
    this.editingId.set(id);
  }

  closeNote(): void {
    this.editingId.set(null);
  }

  // --- Export / import ---

  exportJson(notes?: Note[]): string {
    const data = {
      app: 'keepnote',
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: notes ?? this.notes(),
    };
    return JSON.stringify(data, null, 2);
  }

  exportMarkdown(note: Note): string {
    const out: string[] = [];
    if (note.title) out.push(`# ${note.title}`, '');
    if (note.checklist) {
      const items = parseChecklist(note.content);
      if (items) {
        for (const item of items) out.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
        out.push('');
      } else if (note.content) {
        out.push(note.content, '');
      }
    } else if (note.content) {
      out.push(note.content, '');
    }
    if (note.labels.length) out.push(`Labels: ${note.labels.join(', ')}`, '');
    out.push('---', `_Export from [KeepNote]_  ·  ${new Date(note.updatedAt).toLocaleString()}`);
    return out.join('\n');
  }

  importJson(text: string): void {
    const parsed = JSON.parse(text) as { notes?: Note[] } | Note[];
    const incoming = Array.isArray(parsed) ? parsed : parsed.notes;
    if (!Array.isArray(incoming)) throw new Error('Invalid file format');
    const notes = incoming.map((n) => ({
      id: typeof n.id === 'string' ? n.id : uid(),
      title: String(n.title ?? ''),
      content: String(n.content ?? ''),
      color: String(n.color ?? ''),
      labels: Array.isArray(n.labels) ? n.labels.map(String) : [],
      pinned: Boolean(n.pinned),
      archived: Boolean(n.archived),
      trashed: Boolean(n.trashed),
      checklist: Boolean(n.checklist),
      reminder: n.reminder ? Number(n.reminder) : null,
      createdAt: Number(n.createdAt) || Date.now(),
      updatedAt: Number(n.updatedAt) || Date.now(),
    }));
    this.notes.set(notes);
    this.persist();
    this.showToast(`Imported ${notes.length} note${notes.length === 1 ? '' : 's'}`);
  }

  download(filename: string, content: string, mime = 'application/json'): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Toast ---

  showToast(message: string, actionLabel?: string, action?: () => void): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, actionLabel, action });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }

  hideToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  private persist(): void {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(this.notes()));
    } catch {
      /* ignore */
    }
  }

  private persistLabels(): void {
    try {
      localStorage.setItem(LABELS_KEY, JSON.stringify(this.labels()));
    } catch {
      /* ignore */
    }
  }
}