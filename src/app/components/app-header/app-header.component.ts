import { Component, HostListener, Input, inject, output, signal } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import { ThemeService } from '../../services/theme.service';
import { NotesService } from '../../services/note.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AppIcon],
  styleUrls: ['./app-header.component.css'],
  template: `
    <header class="header">
      <button type="button" class="icon-btn menu-btn" (click)="menuClick.emit()" aria-label="Toggle navigation">
        <app-icon name="menu" />
      </button>

      <a class="brand" href="#" (click)="$event.preventDefault()">
        <span class="brand-logo"><app-icon name="bulb_color" /></span>
        <span class="brand-name">KeepNote</span>
      </a>

      <div class="search" [class.focused]="searchFocused">
        <button type="button" class="search-icon" aria-label="Search">
          <app-icon name="search" />
        </button>
        <input
          #searchInput
          type="text"
          class="search-input"
          placeholder="Search your notes…"
          [value]="query"
          (input)="onQuery(searchInput.value)"
          (focus)="searchFocused = true"
          (blur)="searchFocused = false"
          (keydown.escape)="searchInput.blur()"
          aria-label="Search notes"
        />
        @if (query) {
          <button
            type="button"
            class="search-clear"
            aria-label="Clear search"
            (mousedown)="$event.preventDefault()"
            (click)="clearQuery()"
          >
            <app-icon name="close" />
          </button>
        }
        @if (searchFocused) {
          <kbd>Esc</kbd>
        }
      </div>

      <button
        type="button"
        class="icon-btn mobile-search-btn"
        aria-label="Search"
        (click)="openMobileSearch()"
      >
        <app-icon name="search" />
      </button>

      <div class="spacer"></div>

      <button
        type="button"
        class="icon-btn theme-toggle"
        [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
        (click)="theme.toggle()"
      >
        <app-icon [name]="theme.isDark() ? 'light_mode' : 'dark_mode'" />
      </button>

      <div class="menu-wrap">
        <button
          type="button"
          class="icon-btn"
          aria-label="Data options"
          [attr.aria-expanded]="menuOpen() ? 'true' : 'false'"
          (click)="$event.stopPropagation(); menuOpen.set(!menuOpen())"
        >
          <app-icon name="more" />
        </button>
        @if (menuOpen()) {
          <div class="dropdown" (click)="$event.stopPropagation()">
            <div class="dropdown-title">Data</div>
            <button type="button" class="dropdown-item" (click)="exportAll()">
              <app-icon name="download" />
              <span>Export all notes (.json)</span>
            </button>
            <button type="button" class="dropdown-item" (click)="exportMarkdownAll()">
              <app-icon name="checklist" />
              <span>Export as Markdown (.md)</span>
            </button>
            <button type="button" class="dropdown-item" (click)="fileInput.click()">
              <app-icon name="upload" />
              <span>Import notes (.json)</span>
            </button>
            <div class="dropdown-title">Help</div>
            <button type="button" class="dropdown-item" (click)="openShortcuts()">
              <app-icon name="flash" />
              <span>Keyboard shortcuts</span>
            </button>
            <input
              #fileInput
              type="file"
              accept="application/json,.json"
              class="hidden-file"
              (change)="importFile(fileInput)"
            />
          </div>
        }
      </div>

      <div class="menu-wrap account-wrap">
        <button
          type="button"
          class="account-btn"
          [attr.aria-label]="sync.user() ? 'Account' : 'Sign in to sync'"
          [attr.aria-expanded]="accountOpen() ? 'true' : 'false'"
          (click)="$event.stopPropagation(); accountOpen.set(!accountOpen())"
        >
          <span class="avatar">{{ sync.user() ? initials(sync.user()!.email ?? '') : 'G' }}</span>
          @if (sync.disabled()) {
            <span class="sync-dot local" title="Local only — sync not configured"></span>
          } @else if (sync.signedIn()) {
            <span class="sync-dot" [attr.data-status]="sync.status()" title="Sync status"></span>
          }
        </button>
        @if (accountOpen()) {
          <div class="dropdown account-dropdown" (click)="$event.stopPropagation()">
            @if (sync.user(); as user) {
              <div class="user-row">
                <span class="avatar">{{ initials(user.email ?? 'K') }}</span>
                <div class="user-meta">
                  <strong class="ellipsis">{{ user.email }}</strong>
                  <span class="st" [attr.data-status]="sync.status()">{{ statusLabel() }}</span>
                </div>
              </div>
              <button type="button" class="dropdown-item" (click)="signOut()">
                <app-icon name="delete" />
                <span>Sign out</span>
              </button>
            } @else if (sync.disabled()) {
              <div class="dropdown-title">Sync</div>
              <div class="local-hint">
                Local-only mode. Add your Firebase config to enable accounts &amp; cloud sync.
              </div>
            } @else {
              <button type="button" class="dropdown-item" (click)="openAuth()">
                <app-icon name="add" />
                <span>Sign in to sync notes</span>
              </button>
            }
          </div>
        }
      </div>
    </header>

    @if (mobileSearchOpen()) {
      <div class="mobile-search">
        <button type="button" class="icon-btn" aria-label="Back to notes" (click)="closeMobileSearch()">
          <app-icon name="chevron_left" />
        </button>
        <div class="mobile-search-box">
          <span class="mobile-search-icon"><app-icon name="search" /></span>
          <input
            #mInput
            type="text"
            class="search-input"
            placeholder="Search your notes…"
            [value]="query"
            (input)="onQuery(mInput.value)"
            aria-label="Search notes"
          />
          @if (query) {
            <button
              type="button"
              class="search-clear"
              aria-label="Clear search"
              (click)="clearQuery()"
            >
              <app-icon name="close" />
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AppHeader {
  @Input() query = '';
  readonly menuClick = output<void>();
  readonly queryChange = output<string>();
  protected searchFocused = false;
  protected readonly theme = inject(ThemeService);
  protected readonly notes = inject(NotesService);
  protected readonly sync = inject(SyncService);
  protected readonly menuOpen = signal(false);
  protected readonly accountOpen = signal(false);
  protected readonly mobileSearchOpen = signal(false);

  @HostListener('document:click', ['$event'])
  protected onDocClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.menu-wrap')) {
      this.menuOpen.set(false);
    }
    if (!target?.closest('.account-wrap')) {
      this.accountOpen.set(false);
    }
  }

  protected initials(email: string): string {
    const prefix = email.split('@')[0] || 'K';
    return prefix.slice(0, 2).toUpperCase();
  }

  protected statusLabel(): string {
    switch (this.sync.status()) {
      case 'syncing':
        return 'Syncing…';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync error';
      default:
        return 'Signed in';
    }
  }

  protected openAuth(): void {
    this.accountOpen.set(false);
    this.sync.authDialogOpen.set(true);
  }

  protected signOut(): void {
    this.accountOpen.set(false);
    void this.sync.signOutUser();
  }

  onQuery(value: string): void {
    this.queryChange.emit(value);
  }

  clearQuery(): void {
    this.queryChange.emit('');
  }

  openMobileSearch(): void {
    this.mobileSearchOpen.set(true);
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('.mobile-search input')?.focus();
    }, 20);
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen.set(false);
    this.queryChange.emit('');
  }

  openShortcuts(): void {
    this.menuOpen.set(false);
    this.notes.shortcutsOpen.set(true);
  }

  exportAll(): void {
    this.notes.download(
      `keepnote-${dateStamp()}.json`,
      this.notes.exportJson(),
      'application/json',
    );
    this.notes.showToast(`Exported ${this.notes.notes().length} notes`);
    this.menuOpen.set(false);
  }

  exportMarkdownAll(): void {
    const md = this.notes
      .notes()
      .filter((n) => !n.trashed)
      .map((n) => this.notes.exportMarkdown(n))
      .join('\n\n');
    this.notes.download(`keepnote-${dateStamp()}.md`, md, 'text/markdown');
    this.notes.showToast('Exported notes as Markdown');
    this.menuOpen.set(false);
  }

  importFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.notes.importJson(String(reader.result));
        this.notes.showToast('Import complete');
      } catch {
        this.notes.showToast('Import failed — not a valid KeepNote file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
}

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}