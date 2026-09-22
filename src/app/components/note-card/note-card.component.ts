import { Component, Input, computed, inject, signal } from '@angular/core';
import { Note, formatReminderTime, parseChecklist } from '../../models/note.model';
import { AppIcon } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NotesService } from '../../services/note.service';

@Component({
  selector: 'note-card',
  standalone: true,
  imports: [AppIcon, ColorPicker],
  template: `
    <article
      class="note-card"
      [class.colored]="!!note.color"
      [class.pinned]="note.pinned"
      [class.selecting]="notes.selecting()"
      [class.selected]="notes.selectedIds().includes(note.id)"
      [class.over]="over"
      [attr.draggable]="notes.selecting() ? 'false' : 'true'"
      [style.background]="note.color || 'var(--surface)'"
      (click)="onCardClick()"
      (mouseleave)="hover = false"
      (dragstart)="onDragStart($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="over = false"
      (drop)="onDrop($event)"
      (keydown.enter)="onCardClick()"
      tabindex="0"
    >
      @if (notes.selecting()) {
        <button
          type="button"
          class="select-box"
          [attr.aria-label]="notes.selectedIds().includes(note.id) ? 'Deselect' : 'Select'"
          (click)="$event.stopPropagation(); notes.toggleSelect(note.id)"
        >
          <app-icon [name]="notes.selectedIds().includes(note.id) ? 'check_box' : 'check_box_outline'" />
        </button>
      }

      @if (!notes.selecting() && note.pinned) {
        <span class="pin-flag" [attr.aria-label]="'Pinned'"><app-icon name="pin" /></span>
      }

      @if (!notes.selecting() && note.reminder) {
        <span class="reminder-badge" title="Reminder set">
          <app-icon name="notifications" />
          <span>{{ reminderLabel() }}</span>
        </span>
      }

      <div class="card-inner">
        @if (note.title) {
          <h2 class="card-title">{{ note.title }}</h2>
        }

        @if (note.checklist && checklist().length) {
          <div class="checklist" [class.compact]="!notes.selecting() && checklist().length > 4">
            @for (item of checklist(); track $index) {
              @if (!compactChecklist() || $index < 4) {
                <div class="todo-row" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="todo-check"
                    [class.done]="item.checked"
                    (click)="notes.toggleChecklistItem(note.id, $index)"
                    [attr.aria-label]="item.checked ? 'Mark not done' : 'Mark done'"
                  >
                    <app-icon [name]="item.checked ? 'check_box' : 'check_box_outline'" />
                  </button>
                  <span [class.done-text]="item.checked" (click)="notes.toggleChecklistItem(note.id, $index)">{{ item.text }}</span>
                </div>
              }
            }
            <div class="progress" aria-label="Progress">
              <div class="progress-bar" [style.width.%]="progress()"></div>
            </div>
          </div>
        } @else if (!note.checklist && note.content) {
          <p class="card-body">{{ note.content }}</p>
        }

        @if (note.labels.length) {
          <div class="card-labels">
            @for (label of note.labels; track label) {
              <span class="chip" (click)="$event.stopPropagation(); notes.setActiveLabel(label)">
                <app-icon name="label" />
                <span class="label">{{ label }}</span>
              </span>
            }
          </div>
        }
      </div>

      @if (paletteOpen()) {
        <div class="palette-pop" (mouseenter)="hover = true" (click)="$event.stopPropagation()">
          <app-color-picker
            [selected]="note.color"
            (change)="notes.updateNote(note.id, { color: $event })"
          />
        </div>
      }

      @if (!notes.selecting()) {
        @if (note.trashed) {
          <div class="toolbar" [class.show]="hover">
            <button
              type="button"
              class="icon-btn"
              title="Restore"
              aria-label="Restore note"
              (click)="$event.stopPropagation(); notes.restore(note.id)"
            >
              <app-icon name="restore" />
            </button>
            <button
              type="button"
              class="icon-btn danger"
              title="Delete forever"
              aria-label="Delete forever"
              (click)="$event.stopPropagation(); notes.deleteForever(note.id)"
            >
              <app-icon name="delete_forever" />
            </button>
          </div>
        } @else {
          <div class="toolbar" [class.show]="hover">
            <button
              type="button"
              class="icon-btn"
              [class.active]="note.pinned"
              title="Pin"
              aria-label="Pin note"
              (click)="$event.stopPropagation(); notes.togglePin(note.id)"
            >
              <app-icon name="pin" />
            </button>
            <button
              type="button"
              class="icon-btn"
              [class.active]="paletteOpen()"
              title="Background color"
              aria-label="Change background color"
              (click)="$event.stopPropagation(); paletteOpen.set(!paletteOpen())"
            >
              <app-icon name="palette" />
            </button>
            <button
              type="button"
              class="icon-btn"
              title="Set a reminder"
              aria-label="Set a reminder"
              (click)="
                $event.stopPropagation();
                notes.openNote(note.id)
              "
            >
              <app-icon name="notifications" />
            </button>
            <button
              type="button"
              class="icon-btn"
              title="Archive"
              aria-label="Archive note"
              (click)="
                $event.stopPropagation();
                note.archived ? notes.unarchive(note.id) : notes.archive(note.id)
              "
            >
              <app-icon [name]="note.archived ? 'unarchive' : 'archive'" />
            </button>
            <button
              type="button"
              class="icon-btn"
              title="Delete"
              aria-label="Delete note"
              (click)="$event.stopPropagation(); notes.trash(note.id)"
            >
              <app-icon name="delete" />
            </button>
          </div>
        }
      }
    </article>
  `,
})
export class NoteCard {
  @Input({ required: true }) note!: Note;
  protected readonly notes = inject(NotesService);
  protected hover = false;
  protected over = false;
  protected readonly paletteOpen = signal(false);

  protected readonly current = computed(() =>
    this.notes.notes().find((n) => n.id === this.note.id),
  );

  protected readonly checklist = computed(() => parseChecklist(this.current()?.content ?? '') ?? []);

  protected readonly compactChecklist = computed(
    () => !this.notes.selecting() && this.checklist().length > 4,
  );

  protected readonly progress = computed(() => {
    const items = this.checklist();
    if (!items.length) return 0;
    const done = items.filter((i) => i.checked).length;
    return Math.round((done / items.length) * 100);
  });

  protected readonly reminderLabel = computed(() => {
    const reminder = this.current()?.reminder;
    return reminder ? formatReminderTime(reminder) : '';
  });

  onCardClick(): void {
    if (this.notes.selecting()) {
      this.notes.toggleSelect(this.note.id);
      return;
    }
    this.notes.openNote(this.note.id);
  }

  onDragStart(event: DragEvent): void {
    if (this.notes.selecting()) {
      event.preventDefault();
      return;
    }
    this.hover = true;
    event.dataTransfer?.setData('text/plain', this.note.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent): void {
    if (this.notes.selecting()) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (!this.over) {
      this.over = true;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    if (id) {
      this.notes.moveNote(id, this.note.id);
      this.over = false;
    }
  }
}