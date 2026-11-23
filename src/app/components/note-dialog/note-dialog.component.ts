import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NotesService } from '../../services/note.service';
import { AiService, AiAction, AiOrganizeResult } from '../../services/ai.service';
import { SyncService } from '../../services/sync.service';
import {
  Note,
  formatRelativeTime,
  formatReminderTime,
  parseChecklist,
  wordCount,
} from '../../models/note.model';
import {
  BlockFormat,
  InlineFormat,
  applyBlockFormat,
  applyInlineFormat,
} from '../../models/note-format.model';
import { RichTextPipe } from '../../shared/pipes/rich-text.pipe';

@Component({
  selector: 'note-dialog',
  standalone: true,
  imports: [AppIcon, ColorPicker, RichTextPipe],
  template: `
    @if (note(); as current) {
      <div class="overlay" (click)="notes.closeNote()">
        <div
          class="dialog"
          [class.colored]="!!current.color"
          [class.focus]="notes.focusMode()"
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
            <button
              type="button"
              class="icon-btn focus-toggle"
              [class.active]="notes.focusMode()"
              [attr.aria-label]="notes.focusMode() ? 'Exit focus mode' : 'Enter focus mode'"
              [title]="notes.focusMode() ? 'Exit focus mode' : 'Focus mode'"
              (click)="notes.toggleFocusMode()"
            >
              <app-icon [name]="notes.focusMode() ? 'fullscreen_exit' : 'fullscreen'" />
            </button>
            @if (notes.focusMode()) {
              <button type="button" class="icon-btn" aria-label="Close note" (click)="notes.closeNote()">
                <app-icon name="close" />
              </button>
            }
          </div>

          @if (current.labels.length) {
            <div class="meta-block">
              <span class="section-label">Labels</span>
              <div class="dialog-labels">
                @for (label of current.labels; track label) {
                  <span class="chip">
                    <app-icon name="label" />
                    <span class="label">{{ label }}</span>
                  </span>
                }
              </div>
            </div>
          }

          <div class="editor-section-head">
            <span class="section-label">Content</span>
            @if (!current.checklist) {
              <button
                type="button"
                class="preview-toggle"
                [class.active]="preview()"
                (click)="preview.set(!preview())"
              >
                {{ preview() ? 'Edit text' : 'Preview' }}
              </button>
            }
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
                    (click)="$event.stopPropagation()"
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
          } @else if (preview()) {
            <div class="editor-preview rich-text" [innerHTML]="current.content | richText"></div>
          } @else {
            <div class="format-toolbar" role="toolbar" aria-label="Text formatting">
              @for (action of inlineFormats; track action.id) {
                <button
                  type="button"
                  [attr.class]="'format-btn ' + action.className"
                  [title]="action.title"
                  [attr.aria-label]="action.title"
                  (click)="applyInline(action.kind)"
                >{{ action.label }}</button>
              }
              <span class="toolbar-sep"></span>
              @for (action of blockFormats; track action.id) {
                <button
                  type="button"
                  class="format-btn block-btn"
                  [title]="action.title"
                  [attr.aria-label]="action.title"
                  (click)="applyBlock(action.kind)"
                >{{ action.label }}</button>
              }
            </div>
            <textarea
              #bodyEditor
              class="field content"
              [value]="current.content"
              placeholder="Write something brilliant… use the toolbar for bold, italic, lists and more"
              rows="6"
              (input)="notes.updateNote(current.id, { content: $any($event.target).value })"
              (keydown.control.b)="onFormatKey($any($event), 'bold')"
              (keydown.meta.b)="onFormatKey($any($event), 'bold')"
              (keydown.control.i)="onFormatKey($any($event), 'italic')"
              (keydown.meta.i)="onFormatKey($any($event), 'italic')"
              (keydown.control.u)="onFormatKey($any($event), 'underline')"
              (keydown.meta.u)="onFormatKey($any($event), 'underline')"
            ></textarea>
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

          <div class="editor-meta">
            <span class="section-label">Details</span>
            <div class="stat-pills">
              <span>{{ wordCountFn(current.content) }} words</span>
              <span>{{ current.content.length }} chars</span>
              <span>edited {{ relativeTimeFn(current.updatedAt) }}</span>
              @if (current.createdAt !== current.updatedAt) {
                <span>created {{ relativeTimeFn(current.createdAt) }}</span>
              }
            </div>
          </div>

          @if (aiMenuOpen()) {
            <div class="ai-menu">
              <button type="button" class="ai-item" (click)="runAi('summarize')">
                <app-icon name="lightbulb" />
                <span>Summarize</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('continue')">
                <app-icon name="flash" />
                <span>Continue writing</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('improve')">
                <app-icon name="sparkle" />
                <span>Improve writing</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('fix')">
                <app-icon name="auto_fix" />
                <span>Fix spelling & grammar</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('shorten')">
                <app-icon name="compress" />
                <span>Make shorter</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('title')">
                <app-icon name="title" />
                <span>Suggest a title</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('extract')">
                <app-icon name="checklist" />
                <span>Extract action items</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('tags')">
                <app-icon name="label" />
                <span>Suggest labels</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('organize')">
                <app-icon name="sort" />
                <span>Smart organize</span>
              </button>
              <button type="button" class="ai-item" (click)="runAi('brainstorm')">
                <app-icon name="bulb_color" />
                <span>Brainstorm ideas</span>
              </button>
              <button type="button" class="ai-item" (click)="customOpen.set(!customOpen())">
                <app-icon name="sparkle" />
                <span>Ask anything…</span>
              </button>
              @if (customOpen()) {
                <div class="custom-prompt" (click)="$event.stopPropagation()">
                  <input
                    #customInput
                    class="custom-input"
                    [value]="customPrompt()"
                    placeholder="Tell the AI what to do…"
                    (input)="customPrompt.set($any($event.target).value)"
                    (keydown.enter)="runCustom(customInput.value)"
                  />
                  <button type="button" class="chip ai-apply" (click)="runCustom(customInput.value)">Ask</button>
                </div>
              }
            </div>
          }

          @if (aiBusy()) {
            <div class="ai-panel">
              <div class="ai-title"><app-icon name="sparkle" /><span>AI · {{ aiTitle() }}</span></div>
              <div class="ai-loading">
                <span class="spinner" aria-hidden="true"></span>
                <span>Thinking…</span>
              </div>
            </div>
          } @else if (aiError()) {
            <div class="ai-panel ai-error">
              <div class="ai-title"><app-icon name="sparkle" /><span>AI · {{ aiTitle() }}</span></div>
              <p class="ai-text">{{ aiError() }}</p>
              <div class="ai-actions">
                <button type="button" class="chip" (click)="retryAi()">Retry</button>
                <button type="button" class="chip" (click)="dismissAi()">Close</button>
              </div>
            </div>
          } @else if (aiResult()) {
            <div class="ai-panel">
              <div class="ai-title"><app-icon name="sparkle" /><span>AI · {{ aiTitle() }}</span></div>
              <div class="ai-text">{{ aiResult() }}</div>
              <div class="ai-actions">
                <button type="button" class="chip ai-apply" (click)="applyAi()">{{ applyAiLabel() }}</button>
                <button type="button" class="chip" (click)="copyAi()">Copy</button>
                <button type="button" class="chip" (click)="dismissAi()">Done</button>
              </div>
            </div>
          }

          <div class="dialog-foot">
            <div class="foot-actions">
              <button
                type="button"
                class="icon-btn"
                [class.active]="aiMenuOpen()"
                aria-label="AI assistant"
                title="AI assistant"
                (click)="aiMenuOpen.set(!aiMenuOpen())"
              >
                <app-icon name="sparkle" />
              </button>
              <button
                type="button"
                class="icon-btn"
                aria-label="AI settings"
                title="AI settings"
                (click)="ai.settingsOpen.set(true)"
              >
                <app-icon name="settings" />
              </button>
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
  protected readonly ai = inject(AiService);
  protected readonly sync = inject(SyncService);
  protected readonly paletteOpen = signal(false);
  protected readonly labelsOpen = signal(false);
  protected readonly reminderOpen = signal(false);
  protected readonly aiMenuOpen = signal(false);
  protected readonly aiBusy = signal(false);
  protected readonly aiResult = signal<string | null>(null);
  protected readonly aiError = signal<string | null>(null);
  protected readonly aiMode = signal<AiAction | null>(null);
  protected readonly aiInstruction = signal('');
  protected readonly customOpen = signal(false);
  protected readonly customPrompt = signal('');
  protected readonly preview = signal(false);

  @ViewChild('bodyEditor') bodyEditor?: ElementRef<HTMLTextAreaElement>;

  protected readonly inlineFormats: Array<{
    id: string;
    label: string;
    title: string;
    className: string;
    kind: InlineFormat;
  }> = [
    { id: 'bold', label: 'B', title: 'Bold (Ctrl+B)', className: 'bold', kind: 'bold' },
    { id: 'italic', label: 'I', title: 'Italic (Ctrl+I)', className: 'italic', kind: 'italic' },
    { id: 'underline', label: 'U', title: 'Underline (Ctrl+U)', className: 'underline', kind: 'underline' },
    { id: 'strike', label: 'S', title: 'Strikethrough', className: 'strike', kind: 'strike' },
    { id: 'code', label: '</>', title: 'Inline code', className: 'mono', kind: 'code' },
    { id: 'highlight', label: '==', title: 'Highlight', className: 'marker', kind: 'highlight' },
    { id: 'link', label: '↗', title: 'Insert link', className: 'link-format', kind: 'link' },
  ];

  protected readonly blockFormats: Array<{
    id: string;
    label: string;
    title: string;
    kind: BlockFormat;
  }> = [
    { id: 'heading', label: 'H', title: 'Heading', kind: 'heading' },
    { id: 'quote', label: '❝', title: 'Quote', kind: 'quote' },
    { id: 'bullet', label: '•', title: 'Bullet list', kind: 'bullet' },
    { id: 'numbered', label: '1.', title: 'Numbered list', kind: 'numbered' },
    { id: 'divider', label: '—', title: 'Divider', kind: 'divider' },
  ];

  protected readonly aiTitle = computed(() => {
    switch (this.aiMode()) {
      case 'summarize':
        return 'Summarize';
      case 'continue':
        return 'Continue writing';
      case 'improve':
        return 'Improve writing';
      case 'extract':
        return 'Extract action items';
      case 'title':
        return 'Suggested title';
      case 'fix':
        return 'Fix spelling & grammar';
      case 'shorten':
        return 'Shorter version';
      case 'tags':
        return 'Suggested labels';
      case 'organize':
        return 'Smart organize';
      case 'brainstorm':
        return 'Ideas';
      case 'custom':
        return 'Custom request';
      default:
        return 'Assistant';
    }
  });

  protected readonly applyAiLabel = computed(() => {
    const mode = this.aiMode();
    if (mode === 'continue') return 'Append to note';
    if (mode === 'extract') return 'Make checklist';
    if (mode === 'title') return 'Use as title';
    if (mode === 'tags') return 'Add labels';
    if (mode === 'organize') return 'Apply structure';
    return 'Replace note';
  });

  protected readonly note = this.notes.editingNote;
  protected readonly formatReminderTimeFn = formatReminderTime;
  protected readonly wordCountFn = wordCount;
  protected readonly relativeTimeFn = formatRelativeTime;

  constructor() {
    effect(() => {
      if (this.note()) {
        this.paletteOpen.set(false);
        this.labelsOpen.set(false);
        this.reminderOpen.set(false);
        this.preview.set(false);
        this.dismissAi();
      }
    });
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    if (this.notes.commandPaletteOpen() || this.ai.settingsOpen()) return;
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
    if (!text) return;
    this.notes.addChecklistItem(note.id, text);
    input.value = '';
    input.focus();
  }

  applyInline(format: InlineFormat): void {
    const el = this.bodyEditor?.nativeElement;
    if (!el) return;
    this.writeFormat(
      applyInlineFormat(el.value, el.selectionStart, el.selectionEnd, format),
    );
  }

  applyBlock(format: BlockFormat): void {
    const el = this.bodyEditor?.nativeElement;
    if (!el) return;
    this.writeFormat(applyBlockFormat(el.value, el.selectionStart, el.selectionEnd, format));
  }

  onFormatKey(event: KeyboardEvent, format: InlineFormat): void {
    event.preventDefault();
    this.applyInline(format);
  }

  private writeFormat(result: { text: string; start: number; end: number }): void {
    const note = this.note();
    if (!note) return;
    this.notes.updateNote(note.id, { content: result.text });
    requestAnimationFrame(() => {
      const el = this.bodyEditor?.nativeElement;
      if (!el) return;
      el.value = result.text;
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
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

  async runCustom(value: string): Promise<void> {
    const instruction = value.trim();
    if (!instruction) return;
    await this.runAi('custom', instruction);
  }

  async runAi(action: AiAction, instruction = ''): Promise<void> {
    const note = this.note();
    if (!note || this.aiBusy()) return;
    this.aiMenuOpen.set(false);
    this.customOpen.set(false);
    if (!note.content.trim() && !note.title.trim()) {
      this.aiError.set('There\u2019s nothing to work with yet — add some text to the note first.');
      this.aiMode.set(action);
      return;
    }
    this.aiMode.set(action);
    this.aiInstruction.set(instruction);
    this.aiResult.set(null);
    this.aiError.set(null);
    this.aiBusy.set(true);
    try {
      const authToken = (await this.sync.getIdToken()) ?? undefined;
      const text = await this.ai.generate({
        action,
        title: note.title,
        content: note.content,
        labels: this.notes.allLabels(),
        instruction,
        authToken,
      });
      if (text) {
        this.aiResult.set(text);
        if (this.ai.lastUsedOffline()) {
          this.notes.showToast('Offline AI result — sign in or add your own key for live answers');
        }
      } else {
        this.aiError.set('The AI returned an empty response. Try again.');
      }
    } catch (err) {
      this.aiError.set(err instanceof Error ? err.message : 'AI request failed.');
    } finally {
      this.aiBusy.set(false);
    }
  }

  retryAi(): void {
    const mode = this.aiMode();
    if (mode) void this.runAi(mode, this.aiInstruction());
  }

  applyAi(): void {
    const note = this.note();
    const result = this.aiResult();
    if (!note || !result) return;
    const mode = this.aiMode();
    if (mode === 'continue') {
      this.notes.updateNote(note.id, { content: `${note.content.trim()}\n\n${result}` });
      this.notes.showToast('AI text appended to note');
    } else if (mode === 'extract') {
      this.notes.updateNote(note.id, { content: result, checklist: true });
      this.notes.showToast('Checklist created from AI tasks');
    } else if (mode === 'title') {
      this.notes.updateNote(note.id, { title: result.trim() });
      this.notes.showToast('Title updated by AI');
    } else if (mode === 'tags') {
      const labels = result
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean)
        .slice(0, 5);
      for (const label of labels) this.notes.ensureLabel(label);
      this.notes.updateNote(note.id, { labels: [...new Set([...note.labels, ...labels])] });
      this.notes.showToast('Labels added by AI');
    } else if (mode === 'organize') {
      const parsed = parseAiOrganize(result);
      if (!parsed) {
        this.notes.showToast('AI result could not be applied');
        return;
      }
      const labels = parsed.labels.map((label) => label.trim()).filter(Boolean).slice(0, 5);
      for (const label of labels) this.notes.ensureLabel(label);
      const tasks = parsed.tasks
        .map((task) => task.replace(/^- \[[ xX]\]\s*/, '').trim())
        .filter(Boolean)
        .map((task) => `- [ ] ${task}`);
      const content = [parsed.summary || note.content, ...tasks].filter(Boolean).join('\n\n');
      this.notes.updateNote(note.id, {
        title: parsed.title || note.title,
        labels: [...new Set([...note.labels, ...labels])],
        content,
        checklist: tasks.length > 0,
      });
      this.notes.showToast('Note organized by AI');
    } else {
      this.notes.updateNote(note.id, { content: result });
      this.notes.showToast('Note updated by AI');
    }
    this.dismissAi();
  }

  async copyAi(): Promise<void> {
    const result = this.aiResult();
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      this.notes.showToast('Copied to clipboard');
    } catch {
      this.notes.showToast('Could not copy');
    }
  }

  dismissAi(): void {
    this.aiMenuOpen.set(false);
    this.aiBusy.set(false);
    this.aiResult.set(null);
    this.aiError.set(null);
    this.aiMode.set(null);
    this.aiInstruction.set('');
    this.customOpen.set(false);
  }

  autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }
}

function parseAiOrganize(text: string): AiOrganizeResult | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned) as Partial<AiOrganizeResult>;
    if (!data || typeof data !== 'object') return null;
    return {
      title: typeof data.title === 'string' ? data.title.trim() : '',
      labels: Array.isArray(data.labels) ? data.labels.map(String) : [],
      summary: typeof data.summary === 'string' ? data.summary.trim() : '',
      tasks: Array.isArray(data.tasks) ? data.tasks.map(String) : [],
    };
  } catch {
    return null;
  }
}

function safeName(title: string): string {
  const clean = title.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  return clean || 'untitled';
}
