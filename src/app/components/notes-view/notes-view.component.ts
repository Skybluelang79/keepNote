import { Component, computed, inject, signal } from '@angular/core';
import { NoteCreator } from '../note-creator/note-creator.component';
import { NoteCard } from '../note-card/note-card.component';
import { AppIcon, IconName } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NotesService } from '../../services/note.service';

@Component({
  selector: 'notes-view',
  standalone: true,
  imports: [NoteCreator, NoteCard, AppIcon, ColorPicker],
  styleUrls: ['./notes-view.component.css'],
  template: `
    <div class="view" [attr.data-view]="notes.view()">
      @if (notes.selecting()) {
        <div class="batch-bar">
          <button type="button" class="icon-btn" (click)="selectAll()" [attr.aria-label]="'Select visible'">
            <app-icon name="select" />
          </button>
          <span class="batch-count">{{ selectedCount() }} selected</span>
          <div class="batch-actions">
            @if (notes.view() !== 'trash') {
              <button
                type="button"
                class="icon-btn danger"
                title="Archive"
                aria-label="Archive selected"
                (click)="archiveSelected()"
              >
                <app-icon name="archive" />
              </button>
            }
            <button
              type="button"
              class="icon-btn"
              [class.active]="paletteOpen()"
              title="Background color"
              aria-label="Set background color"
              (click)="paletteOpen.set(!paletteOpen())"
            >
              <app-icon name="palette" />
            </button>
            @if (notes.view() === 'trash') {
              <button
                type="button"
                class="icon-btn"
                title="Restore"
                aria-label="Restore selected"
                (click)="restoreSelected()"
              >
                <app-icon name="restore" />
              </button>
              <button
                type="button"
                class="icon-btn danger"
                title="Delete forever"
                aria-label="Delete selected forever"
                (click)="deleteSelected()"
              >
                <app-icon name="delete_forever" />
              </button>
            } @else {
              <button
                type="button"
                class="icon-btn danger"
                title="Move to trash"
                aria-label="Move selected to trash"
                (click)="trashSelected()"
              >
                <app-icon name="delete" />
              </button>
            }
          </div>
          @if (paletteOpen()) {
            <div class="batch-palette">
              <app-color-picker [selected]="''" (change)="applyColor($event)" />
            </div>
          }
          <button type="button" class="icon-btn" aria-label="Done selecting" (click)="notes.stopSelecting()">
            <app-icon name="close" />
          </button>
        </div>
      }

      @if (notes.query()) {
        <div class="result-banner">
          <app-icon name="search" />
          <span>{{ resultCount() }} result{{ resultCount() === 1 ? '' : 's' }} for “{{ notes.query() }}”</span>
        </div>
      }

      @if (notes.activeLabel()) {
        <div class="result-banner">
          <app-icon name="label" />
          <span>{{ notes.activeLabel() }}</span>
          <button type="button" class="clear-label" (click)="notes.setActiveLabel(null)">Clear</button>
        </div>
      }

      @switch (notes.view()) {
        @case ('trash') {
          <div class="view-head">
            <div>
              <h1 class="view-title">Trash</h1>
              <p class="view-sub">Notes stay here for a while. Restore or permanently delete them.</p>
            </div>
            <div class="head-actions">
              @if (trashCount() > 0) {
                <button type="button" class="empty-btn" (click)="notes.emptyTrash()">Empty trash</button>
              }
              <button
                type="button"
                class="icon-btn"
                [class.active]="notes.selecting()"
                title="Select notes"
                aria-label="Select multiple notes"
                (click)="notes.selecting() ? notes.stopSelecting() : notes.startSelecting()"
              >
                <app-icon name="select" />
              </button>
            </div>
          </div>
        }
        @case ('archive') {
          <div class="view-head">
            <div>
              <h1 class="view-title">Archive</h1>
              <p class="view-sub">Notes you archived are tucked away until you need them again.</p>
            </div>
            <div class="head-actions">
              <button
                type="button"
                class="icon-btn"
                [class.active]="notes.selecting()"
                title="Select notes"
                aria-label="Select multiple notes"
                (click)="notes.selecting() ? notes.stopSelecting() : notes.startSelecting()"
              >
                <app-icon name="select" />
              </button>
            </div>
          </div>
        }
        @default {
          <div class="notes-head">
            <span class="note-count">{{ noteCount() }} note{{ noteCount() === 1 ? '' : 's' }}</span>
            <button
              type="button"
              class="select-toggle"
              [class.active]="notes.selecting()"
              (click)="notes.selecting() ? notes.stopSelecting() : notes.startSelecting()"
            >
              <app-icon name="select" />
              <span>Select</span>
            </button>
          </div>
          <note-creator />
          <div class="shortcuts-hint">
            <span><kbd>N</kbd> new note</span>
            <span><kbd>/</kbd> search</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        }
      }

      @if (viewTotal() === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <app-icon [name]="emptyIcon()" />
          </div>
          <h3>{{ emptyTitle() }}</h3>
          <p>{{ emptyHint() }}</p>
        </div>
      } @else {
        <div class="masonry">
          @if (notes.view() === 'notes' && !notes.activeLabel() && pinned().length) {
            <div class="section">
              <h3 class="section-title">Pinned</h3>
              <div class="masonry">
                @for (note of pinned(); track note.id) {
                  <note-card [note]="note" />
                }
              </div>
            </div>
          }
          @if (notes.view() === 'notes' && !notes.activeLabel() && others().length) {
            <div class="section">
              <h3 class="section-title">{{ pinned().length ? 'Others' : '' }}</h3>
              <div class="masonry">
                @for (note of others(); track note.id) {
                  <note-card [note]="note" />
                }
              </div>
            </div>
          }
          @if (notes.view() !== 'notes' || notes.activeLabel()) {
            @for (note of others(); track note.id) {
              <note-card [note]="note" />
            }
          }
        </div>
      }
    </div>
  `,
})
export class NotesView {
  protected readonly notes = inject(NotesService);
  protected readonly paletteOpen = signal(false);

  protected readonly pinned = computed(() => this.notes.visible().pinned);
  protected readonly others = computed(() => this.notes.visible().others);
  protected readonly visibleAll = computed(() => [...this.pinned(), ...this.others()]);
  protected readonly viewTotal = computed(() => this.visibleAll().length);
  protected readonly selectedCount = computed(() => this.notes.selectedIds().length);
  protected readonly trashCount = computed(() => this.notes.trashCount());
  protected readonly noteCount = computed(() => this.notes.noteCount());
  protected readonly resultCount = computed(() => this.viewTotal());

  protected readonly emptyIcon = computed<IconName>(() =>
    this.notes.view() === 'archive'
      ? 'empty_archive'
      : this.notes.view() === 'trash'
        ? 'empty_trash'
        : 'empty_notes',
  );

  protected readonly emptyTitle = computed(() => {
    if (this.notes.view() === 'archive') return 'No archived notes';
    if (this.notes.view() === 'trash') return 'Trash is empty';
    if (this.notes.activeLabel()) return 'No notes with this label';
    if (this.notes.query()) return 'No matching notes';
    return 'No notes yet';
  });

  protected readonly emptyHint = computed(() => {
    if (this.notes.view() === 'archive') return 'Archived notes will appear here.';
    if (this.notes.view() === 'trash') return 'Deleted notes will appear here.';
    if (this.notes.activeLabel()) return 'Add this label to a note from its editor.';
    if (this.notes.query()) return 'Try a different search or clear the filter.';
    return 'Capture an idea up top — your first note is one tap away (press N).';
  });

  selectAll(): void {
    const ids = this.visibleAll().map((n) => n.id);
    const selected = new Set(this.notes.selectedIds());
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    if (allSelected) {
      this.notes.selectedIds.set(this.notes.selectedIds().filter((id) => !selected.has(id)));
      return;
    }
    const merged = [...new Set([...this.notes.selectedIds(), ...ids])];
    this.notes.selectedIds.set(merged);
  }

  archiveSelected(): void {
    this.notes.batch((ids) => this.notes.batchArchive(ids));
  }

  trashSelected(): void {
    this.notes.batch((ids) => this.notes.batchTrash(ids));
  }

  restoreSelected(): void {
    this.notes.batch((ids) => this.notes.batchRestore(ids));
  }

  deleteSelected(): void {
    this.notes.batch((ids) => this.notes.batchDelete(ids));
  }

  applyColor(color: string): void {
    if (!this.notes.selectedIds().length) return;
    this.notes.batchColor(this.notes.selectedIds(), color);
    this.notes.showToast(`Color applied to ${this.notes.selectedIds().length} notes`);
    this.paletteOpen.set(false);
    this.notes.stopSelecting();
  }
}