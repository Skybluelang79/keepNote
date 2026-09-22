import { Component, HostListener, inject } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import { NotesService } from '../../services/note.service';

@Component({
  selector: 'app-shortcuts',
  standalone: true,
  imports: [AppIcon],
  styleUrls: ['./app-shortcuts.component.css'],
  template: `
    @if (notes.shortcutsOpen()) {
      <div class="overlay" (click)="notes.shortcutsOpen.set(false)">
        <div class="panel" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" (click)="$event.stopPropagation()">
          <div class="panel-head">
            <h2 class="panel-title">Keyboard shortcuts</h2>
            <button type="button" class="icon-btn" aria-label="Close" (click)="notes.shortcutsOpen.set(false)">
              <app-icon name="close" />
            </button>
          </div>
          <div class="panel-body">
            @for (row of rows; track row.keys) {
              <div class="row">
                <span class="keys">
                  @for (key of row.keys; track key) {
                    <kbd>{{ key }}</kbd>
                  }
                </span>
                <span class="desc">{{ row.desc }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ShortcutsDialog {
  protected readonly notes = inject(NotesService);
  protected readonly rows = [
    { keys: ['N'], desc: 'Create a new note' },
    { keys: ['/', 'F'], desc: 'Search your notes' },
    { keys: ['Esc'], desc: 'Close dialog / exit selection' },
    { keys: ['?', 'Alt + /'], desc: 'Show this help' },
  ];

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.notes.shortcutsOpen.set(false);
    }
  }
}