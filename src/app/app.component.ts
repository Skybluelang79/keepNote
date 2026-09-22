import { Component, HostListener, inject } from '@angular/core';
import { AppHeader } from './components/app-header/app-header.component';
import { AppSidebar } from './components/app-sidebar/app-sidebar.component';
import { NotesView } from './components/notes-view/notes-view.component';
import { NoteDialog } from './components/note-dialog/note-dialog.component';
import { ShortcutsDialog } from './components/app-shortcuts/app-shortcuts.component';
import { AppIcon } from './components/app-icon/app-icon.component';
import { NotesService } from './services/note.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppHeader, AppSidebar, NotesView, NoteDialog, ShortcutsDialog, AppIcon],
  styleUrls: ['./app.component.css'],
  template: `
    <div class="app">
      <app-header
        [query]="notes.query()"
        (queryChange)="notes.setQuery($event)"
        (menuClick)="notes.sidebarOpen.set(!notes.sidebarOpen())"
      />

      <div class="body" [class.sidebar-open]="notes.sidebarOpen()">
        <div class="scrim" [class.show]="notes.sidebarOpen()" (click)="notes.sidebarOpen.set(false)"></div>
        <div class="sidebar-rail" [class.open]="notes.sidebarOpen()">
          <app-sidebar />
        </div>
        <main class="main">
          <notes-view />
        </main>
      </div>

      <note-dialog />
      <app-shortcuts />

      @if (toast(); as t) {
        <div class="toast" role="status">
          <span class="toast-msg">{{ t.message }}</span>
          @if (t.actionLabel && t.action) {
            <button type="button" class="toast-action" (click)="t.action(); notes.hideToast()">
              {{ t.actionLabel }}
            </button>
          }
          <button type="button" class="icon-btn toast-close" aria-label="Dismiss" (click)="notes.hideToast()">
            <app-icon name="close" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AppComponent {
  protected readonly notes = inject(NotesService);
  protected readonly toast = inject(NotesService).toast;

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);
    if (typing) return;

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      this.notes.stopSelecting();
      const creator = document.querySelector<HTMLTextAreaElement>('note-creator textarea');
      creator?.focus();
    } else if (event.key === 'f' || event.key === 'F' || event.key === '/') {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>('.search-input');
      input?.focus();
    } else if (event.key === 'Escape') {
      this.notes.stopSelecting();
    } else if (event.key === '?' || (event.key.toLowerCase() === '/' && event.altKey)) {
      event.preventDefault();
      this.notes.shortcutsOpen.set(true);
    }
  }

  ngOnInit(): void {
    this.notes.checkReminders();
    this.timer = window.setInterval(() => this.notes.checkReminders(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) window.clearInterval(this.timer);
  }

  private timer: number | null = null;
}