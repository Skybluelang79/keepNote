import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NoteCreator } from '../note-creator/note-creator.component';
import { NoteCard } from '../note-card/note-card.component';
import { AppIcon, IconName } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NotesService, SortMode, LayoutMode } from '../../services/note.service';
import { wordCount } from '../../models/note.model';

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
            <div class="head-row">
              <span class="note-count">{{ noteCount() }} note{{ noteCount() === 1 ? '' : 's' }}</span>
              <div class="view-controls">
                <div class="sort-wrap" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="sort-btn"
                    [class.active]="sortOpen()"
                    (click)="sortOpen.set(!sortOpen())"
                    aria-haspopup="menu"
                    [attr.aria-expanded]="sortOpen()"
                  >
                    <app-icon name="sort" />
                    <span>{{ sortLabel() }}</span>
                    <app-icon name="chevron_down" />
                  </button>
                  @if (sortOpen()) {
                    <div class="sort-menu" role="menu">
                      @for (option of sortOptions; track option.value) {
                        <button
                          type="button"
                          class="sort-item"
                          [class.selected]="sortMode() === option.value"
                          role="menuitem"
                          (click)="setSort(option.value)"
                        >
                          <app-icon name="check" />
                          <span>{{ option.label }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
                <div class="layout-toggle" role="group" aria-label="Layout">
                  <button
                    type="button"
                    class="icon-btn"
                    [class.active]="layout() === 'cards'"
                    title="Grid view"
                    aria-label="Grid view"
                    (click)="setLayout('cards')"
                  >
                    <app-icon name="grid" />
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    [class.active]="layout() === 'list'"
                    title="List view"
                    aria-label="List view"
                    (click)="setLayout('list')"
                  >
                    <app-icon name="list" />
                  </button>
                </div>
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
            </div>
            <note-creator />
            <div class="shortcuts-hint">
              <span><kbd>N</kbd> new note</span>
              <span><kbd>/</kbd> search</span>
              <span><kbd>Esc</kbd> close</span>
            </div>
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
        <div class="masonry" [class.list]="layout() === 'list'">
          @if (notes.view() === 'notes' && !notes.activeLabel()) {
            @if (pinned().length) {
              <div class="section">
                <h3 class="section-title">Pinned <span class="count">{{ pinned().length }}</span></h3>
                <div class="masonry" [class.list]="layout() === 'list'">
                  @for (note of pinned(); track note.id) {
                    <note-card [note]="note" [layout]="layout()" />
                  }
                </div>
              </div>
            }
            @if (others().length) {
              <div class="section">
                @if (pinned().length) {
                  <h3 class="section-title">Others <span class="count">{{ others().length }}</span></h3>
                }
                <div class="masonry" [class.list]="layout() === 'list'">
                  @for (note of others(); track note.id) {
                    <note-card [note]="note" [layout]="layout()" />
                  }
                </div>
              </div>
            }
          } @else {
            @for (note of others(); track note.id) {
              <note-card [note]="note" [layout]="layout()" />
            }
          }
        </div>

        @if (showStats()) {
          <div class="stats-bar">
            <span class="stat"><app-icon name="lightbulb" />{{ noteCount() }} note{{ noteCount() === 1 ? '' : 's' }}</span>
            <span class="sep">·</span>
            <span class="stat">{{ statsWords() }} words</span>
            <span class="sep">·</span>
            <span class="stat">{{ editedThisWeek() }} edited this week</span>
          </div>
        }
      }
    </div>
  `,
})
export class NotesView {
  protected readonly notes = inject(NotesService);
  protected readonly paletteOpen = signal(false);
  protected readonly sortOpen = signal(false);

  protected sortOptions: { value: SortMode; label: string }[] = [
    { value: 'updated', label: 'Last edited' },
    { value: 'created', label: 'Newest first' },
    { value: 'az', label: 'A → Z' },
  ];

  protected readonly sortMode = computed(() => this.notes.sortMode());
  protected readonly sortLabel = computed(
    () => this.sortOptions.find((o) => o.value === this.sortMode())?.label ?? 'Last edited',
  );
  protected readonly layout = computed(() => this.notes.layout());

  protected readonly pinned = computed(() => this.notes.visible().pinned);
  protected readonly others = computed(() => this.notes.visible().others);
  protected readonly visibleAll = computed(() => [...this.pinned(), ...this.others()]);
  protected readonly viewTotal = computed(() => this.visibleAll().length);
  protected readonly selectedCount = computed(() => this.notes.selectedIds().length);
  protected readonly trashCount = computed(() => this.notes.trashCount());
  protected readonly noteCount = computed(() => this.notes.noteCount());
  protected readonly resultCount = computed(() => this.viewTotal());

  protected readonly showStats = computed(
    () =>
      this.notes.view() === 'notes' &&
      !this.notes.activeLabel() &&
      !this.notes.query() &&
      this.viewTotal() > 0,
  );
  protected readonly statsWords = computed(() =>
    this.visibleAll().reduce((sum, n) => sum + wordCount(n.content), 0),
  );
  protected readonly editedThisWeek = computed(
    () => this.visibleAll().filter((n) => Date.now() - n.updatedAt < 7 * 86_400_000).length,
  );

  @HostListener('window:click')
  protected onDocClick(): void {
    this.sortOpen.set(false);
  }

  setSort(mode: SortMode): void {
    this.notes.setSort(mode);
    this.sortOpen.set(false);
  }

  setLayout(mode: LayoutMode): void {
    this.notes.setLayout(mode);
  }

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