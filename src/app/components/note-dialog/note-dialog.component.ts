import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NotesService } from '../../services/note.service';
import { Note, formatRelativeTime, formatReminderTime, parseChecklist, wordCount } from '../../models/note.model';

@Component({
  selector: 'note-dialog',
  standalone: true,
  imports: [AppIcon, ColorPicker],
  template: `
    @if (note(); as current) {
      <div class="overlay" (click)="notes.closeNote()">
        <div
          class="dialog"
          [class.colored]="!!current.color"
          [style.background]="current.color || 'var(--surface)'"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-label="Edit note"
        >
          <div class="dialog-top">
            <textarea
              class="field title"
              [value]="current.title"
              placeholder="Title"
              rows="1"
              (input)="onTitle($any($event.target), current)"
              (keydown.enter)="$any($event.target).blur()"
            ></textarea>
            <button
              type="button"
              class="icon-btn"
              [class.active]="current.pinned"
              [attr.aria-label]="current.pinned ? 'Unpin note' : 'Pin note'"
              (click)="notes.togglePin(current.id)"
            >
              <app-icon [name]="current.pinned ? 'pin' : 'pin_off'" />
            </button>
          </div>

          @if (current.checklist) {
            <div class="checklist-editor">
              @for (item of checklistItems(current); track $index; let i = $index) {
                <div class="todo-row" (click)="notes.toggleChecklistItem(current.id, i)">
                  <button
                    type="button"
                    class="todo-check"
                    [class.done]="item.checked"
                    [attr.aria-label]="item.checked ? 'Mark not done' : 'Mark done'"
                  >
                    <app-icon [name]="item.checked ? 'check_box' : 'check_box_outline'" />
                  </button>
                  <input
                    class="todo-input"
                    [value]="item.text"
                    placeholder="Task"
                    (click)="$event.stopPropagation()"
                    (input)="notes.updateChecklistItem(current.id, i, $any($event.target).value)"
                    (keydown.enter)="newItem.focus()"
                  />
                </div>
              }
              <div class="todo-row add-row">
                <app-icon name="add" />
                <input
                  #newItem
                  class="todo-input"
                  placeholder="Add an item, press Enter"
                  (keydown.enter)="addItem(current, newItem)"
                />
              </div>
            </div>
          } @else {
            <textarea
              class="field content"
              [value]="current.content"
              placeholder="Note"
              rows="6"
              (input)="notes.updateNote(current.id, { content: $any($event.target).value })"
            ></textarea>
          }

          @if (current.labels.length) {
            <div class="dialog-labels">
              @for (label of current.labels; track label) {
                <span class="chip">
                  <app-icon name="label" />
                  <span class="label">{{ label }}</span>
                </span>
              }
            </div>
          }

          @if (reminderOpen()) {
            <div class="reminder-panel" (click)="$event.stopPropagation()">
              <div class="reminder-row">
                <app-icon name="notifications" />
                <input
                  #when
                  class="reminder-input"
                  type="datetime-local"
                  [value]="current.reminder ? toLocalInput(current.reminder) : ''"
                  (change)="setReminder(current, when.value)"
                />
              </div>
              <div class="reminder-row">
                <span class="muted">{{ current.reminder ? 'Reminder · ' + formatReminderTimeFn(current.reminder) : 'No reminder set' }}</span>
              </div>
              <div class="quick-row">
                <button type="button" class="chip" (click)="quickReminder(current, 60 * 60 * 1000)">+1 hour</button>
                <button type="button" class="chip" (click)="quickReminder(current, 3 * 60 * 60 * 1000)">+3 hours</button>
                <button type="button" class="chip" (click)="quickReminder(current, 26 * 60 * 60 * 1000)">Tomorrow</button>
                @if (current.reminder) {
                  <button type="button" class="chip danger-chip" (click)="notes.setReminder(current.id, null)">Clear</button>
                }
              </div>
            </div>
          }

          @if (paletteOpen()) {
            <div class="palette-pop">
              <app-color-picker [selected]="current.color" (change)="notes.updateNote(current.id, { color: $event })" />
            </div>
          }

          <div class="dialog-labels-edit" [class.open]="labelsOpen()">
            <button
              type="button"
              class="chip label-toggle"
              [class.selected]="labelsOpen()"
              (click)="labelsOpen.set(!labelsOpen())"
            >
              <app-icon name="add_label" />
              <span class="label">Label</span>
            </button>
            @if (labelsOpen()) {
              <div class="label-options">
                @for (label of notes.allLabels(); track label) {
                  <button
                    type="button"
                    class="label-option"
                    [class.selected]="current.labels.includes(label)"
                    (click)="toggleLabel(current, label)"
                  >
                    <app-icon name="label" />
                    <span>{{ label }}</span>
                    @if (current.labels.includes(label)) {
                      <app-icon name="check" />
                    }
                  </button>
                } @empty {
                  <span class="muted">No labels yet — create one in the sidebar</span>
                }
              </div>
            }
          </div>

          <div class="dialog-stats">
            {{ stats(current) }}
          </div>

          <div class="dialog-foot">
            <div class="foot-actions">
              <button
                type="button"
                class="icon-btn"
                [class.active]="paletteOpen()"
                aria-label="Background color"
                title="Background color"
                (click)="paletteOpen.set(!paletteOpen())"
              >
                <app-icon name="palette" />
              </button>
              <button
                type="button"
                class="icon-btn"
                [class.active]="current.checklist"
                aria-label="Toggle checklist"
                title="Toggle checklist"
                (click)="notes.toggleChecklist(current.id)"
              >
                <app-icon name="checklist" />
              </button>
              <button
                type="button"
                class="icon-btn"
                [class.active]="reminderOpen()"
                aria-label="Set a reminder"
                title="Set a reminder"
                (click)="reminderOpen.set(!reminderOpen())"
              >
                <app-icon name="notifications" />
              </button>
              @if (!current.trashed) {
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Duplicate note"
                  title="Duplicate"
                  (click)="notes.duplicateNote(current.id)"
                >
                  <app-icon name="copy" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Download as Markdown"
                  title="Download Markdown"
                  (click)="downloadMd(current)"
                >
                  <app-icon name="download" />
                </button>
              }
              @if (current.trashed) {
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Restore note"
                  title="Restore"
                  (click)="notes.restore(current.id)"
                >
                  <app-icon name="restore" />
                </button>
                <button
                  type="button"
                  class="icon-btn danger"
                  aria-label="Delete forever"
                  title="Delete forever"
                  (click)="notes.deleteForever(current.id)"
                >
                  <app-icon name="delete_forever" />
                </button>
              } @else {
                <button
                  type="button"
                  class="icon-btn"
                  [title]="current.archived ? 'Unarchive' : 'Archive'"
                  [attr.aria-label]="current.archived ? 'Unarchive note' : 'Archive note'"
                  (click)="current.archived ? notes.unarchive(current.id) : notes.archive(current.id)"
                >
                  <app-icon [name]="current.archived ? 'unarchive' : 'archive'" />
                </button>
                <button
                  type="button"
                  class="icon-btn danger"
                  aria-label="Delete note"
                  title="Delete"
                  (click)="notes.trash(current.id)"
                >
                  <app-icon name="delete" />
                </button>
              }
            </div>
            <button type="button" class="done-btn" (click)="notes.closeNote()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class NoteDialog {
  protected readonly notes = inject(NotesService);
  protected readonly paletteOpen = signal(false);
  protected readonly labelsOpen = signal(false);
  protected readonly reminderOpen = signal(false);

  protected readonly note = this.notes.editingNote;
  protected readonly formatReminderTimeFn = formatReminderTime;

  constructor() {
    effect(() => {
      if (this.note()) {
        this.paletteOpen.set(false);
        this.labelsOpen.set(false);
        this.reminderOpen.set(false);
      }
    });
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    if (this.note()) this.notes.closeNote();
  }

  onTitle(el: HTMLTextAreaElement, note: Note): void {
    this.notes.updateNote(note.id, { title: el.value });
    this.autoGrow(el);
  }

  checklistItems(note: Note) {
    return parseChecklist(note.content) ?? [];
  }

  addItem(note: Note, input: HTMLInputElement): void {
    const text = input.value.trim();
    this.notes.addChecklistItem(note.id, text);
    input.value = '';
    input.focus();
  }

  toggleLabel(note: Note, label: string): void {
    const labels = note.labels.includes(label)
      ? note.labels.filter((l) => l !== label)
      : [...note.labels, label];
    this.notes.updateNote(note.id, { labels });
  }

  stats(note: Note): string {
    const words = wordCount(note.content);
    const chars = note.content.length;
    return `${words} word${words === 1 ? '' : 's'} · ${chars} char${chars === 1 ? '' : 's'} · edited ${formatRelativeTime(note.updatedAt)}`;
  }

  toLocalInput(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  setReminder(note: Note, value: string): void {
    if (!value) {
      this.notes.setReminder(note.id, null);
      return;
    }
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      this.notes.setReminder(note.id, ms);
      this.notes.showToast('Reminder set');
    }
  }

  quickReminder(note: Note, offsetMs: number): void {
    this.notes.setReminder(note.id, Date.now() + offsetMs);
    this.notes.showToast('Reminder set');
  }

  downloadMd(note: Note): void {
    this.notes.download(`${safeName(note.title)}.md`, this.notes.exportMarkdown(note), 'text/markdown');
  }

  autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }
}

function safeName(title: string): string {
  const clean = title.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  return clean || 'untitled';
}