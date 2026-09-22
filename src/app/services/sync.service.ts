import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  Unsubscribe,
  doc,
  enableIndexedDbPersistence,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { Note } from '../models/note.model';
import { NotesService, isSeededOnly } from './note.service';
import { environment } from '../../environments/environment';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';

interface CloudData {
  notes?: Note[];
  labels?: string[];
  updatedAt?: number;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly user = signal<User | null>(null);
  readonly status = signal<SyncStatus>('off');
  readonly authDialogOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly signedIn = computed(() => this.user() !== null);
  readonly disabled = signal(!SyncService.isConfigured());

  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private listener: Unsubscribe | null = null;
  private lastPushed = '';
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly notesService = inject(NotesService);
  private readonly zone = inject(NgZone);

  constructor() {
    if (this.disabled()) return;

    this.zone.run(() => {
      this.status.set('signed-out');
    });

    this.app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    // Offline-first: queue writes locally and keep working with no connection.
    enableIndexedDbPersistence(this.db).catch(() => undefined);

    onAuthStateChanged(this.auth, (user) => {
      this.zone.run(() => {
        this.user.set(user);
        this.error.set('');
      });
      if (user) {
        this.startSync();
      } else {
        this.stopSync();
      }
    });

    processRedirect(this.auth);

    effect(() => {
      void this.notesService.notes();
      void this.notesService.labels();
      this.schedulePush();
    });
  }

  static isConfigured(): boolean {
    const f = environment.firebase;
    return Boolean(
      f &&
        typeof f.apiKey === 'string' &&
        f.apiKey !== 'YOUR_API_KEY' &&
        typeof f.projectId === 'string' &&
        f.projectId !== 'your-project',
    );
  }

  // --- Auth actions ---

  async signIn(email: string, password: string): Promise<void> {
    if (!this.auth) return;
    this.zone.run(() => {
      this.busy.set(true);
      this.error.set('');
    });
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (err) {
      this.zone.run(() => this.error.set(authMessage(err)));
    } finally {
      this.zone.run(() => this.busy.set(false));
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    if (!this.auth) return;
    this.zone.run(() => {
      this.busy.set(true);
      this.error.set('');
    });
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
    } catch (err) {
      this.zone.run(() => this.error.set(authMessage(err)));
    } finally {
      this.zone.run(() => this.busy.set(false));
    }
  }

  signInWithGoogle(): void {
    if (!this.auth) return;
    signInWithRedirect(this.auth, new GoogleAuthProvider()).catch((err) => {
      this.zone.run(() => this.error.set(authMessage(err)));
    });
  }

  async signOutUser(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
    this.zone.run(() => this.authDialogOpen.set(false));
  }

  // --- Sync ---

  private startSync(): void {
    const user = this.user();
    const db = this.db;
    if (!user || !db) return;
    if (this.listener) this.listener();

    this.zone.run(() => this.status.set('syncing'));
    const target = doc(db, 'users', user.uid, 'data', 'main');

    getDoc(target)
      .then((snap) => {
        const remote = snap.exists() ? (snap.data() as CloudData) : null;
        this.adoptCloud(remote);
      })
      .catch(() => this.adoptCloud(null))
      .finally(() => {
        this.listener = onSnapshot(
          target,
          (snap) => {
            this.zone.run(() => this.status.set('synced'));
            const remote = snap.exists() ? (snap.data() as CloudData) : null;
            this.onRemote(remote);
          },
          () => this.zone.run(() => this.status.set('error')),
        );
      });
  }

  private stopSync(): void {
    if (this.listener) {
      this.listener();
      this.listener = null;
    }
    this.zone.run(() => this.status.set('signed-out'));
  }

  private adoptCloud(remote: CloudData | null): void {
    const local = this.notesService.notes();
    const localLabels = this.notesService.labels();

    if (!remote || !Array.isArray(remote.notes)) {
      // First sync: upload local data to the cloud.
      this.pushNow();
      return;
    }

    // Fresh device signing into an existing account: never copy pristine
    // demo seeds over the user's real cloud notes.
    const cloud = remote.notes as Note[];
    if (cloud.length && isSeededOnly(local)) {
      this.lastPushed = cloudPayload({ notes: cloud, labels: remote.labels ?? [] });
      this.zone.run(() => {
        this.notesService.replaceFromCloud(cloud, remote.labels ?? []);
      });
      this.pushNow();
      return;
    }

    const merged = mergeNotes(local, cloud);
    const labels = mergeLabels(localLabels, remote.labels ?? []);

    this.lastPushed = cloudPayload({ notes: merged, labels });
    this.zone.run(() => {
      this.notesService.replaceFromCloud(merged, labels);
    });
    this.pushNow();
  }

  private onRemote(remote: CloudData | null): void {
    if (!remote || !Array.isArray(remote.notes)) return;
    const payload = cloudPayload(remote);
    if (payload === this.lastPushed) return; // our own echo

    const merged = mergeNotes(this.notesService.notes(), remote.notes as Note[]);
    const labels = mergeLabels(this.notesService.labels(), remote.labels ?? []);
    this.lastPushed = payload;
    this.zone.run(() => {
      this.notesService.replaceFromCloud(merged, labels);
    });
  }

  private schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.pushNow(), 400);
  }

  private pushNow(): void {
    const user = this.user();
    const db = this.db;
    if (!user || !db) return;
    const payload = { notes: this.notesService.notes(), labels: this.notesService.labels(), updatedAt: Date.now() };
    if (cloudPayload(payload) === this.lastPushed) return;
    this.lastPushed = cloudPayload(payload);
    setDoc(doc(db, 'users', user.uid, 'data', 'main'), payload).catch(() => {
      // Offline or transient failure — clear the guard so the next change retries.
      this.lastPushed = '';
    });
  }
}

/**
 * Canonical string for the sync guard. Firestore re-orders object keys on read,
 * so a naive JSON.stringify comparison would never match our own writes.
 */
function cloudPayload(cloud: CloudData | null): string {
  if (!cloud) return '';
  const notes = Array.isArray(cloud.notes) ? cloud.notes : [];
  const labels = cloud.labels ?? [];
  return canonical(['labels', labels, 'notes', notes]);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return '{' + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password — try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/network-request-failed': 'Network error — check your connection.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

function mergeNotes(local: Note[], remote: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const n of local) byId.set(n.id, n);
  for (const n of remote) {
    const existing = byId.get(n.id);
    byId.set(n.id, existing && existing.updatedAt > n.updatedAt ? existing : n);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeLabels(local: string[], remote: string[]): string[] {
  const set = new Set<string>([...local, ...remote]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function processRedirect(auth: Auth): void {
  getRedirectResult(auth).catch(() => undefined);
}