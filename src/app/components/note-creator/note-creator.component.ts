import { Component, inject, signal } from '@angular/core';
import { AppIcon, IconName } from '../app-icon/app-icon.component';
import { ColorPicker } from '../color-picker/color-picker.component';
import { NoteTemplate, NOTE_TEMPLATES } from '../../models/note.model';
import { NotesService } from '../../services/note.service';

@Component({
  selector: 'note-creator',
  standalone: true,
  imports: [AppIcon, ColorPicker],
  styleUrls: ['./note-creator.component.css'],
  template: `
    <div class="creator" [class.expanded]="expanded()" [class.colored]="!!color()">
      @if (expanded()) {
        <div class="title-row">
          <input
            #title
            class="creator-title"
            placeholder="Title"
            [value]="titleValue"
            [style.background]="color()"
            (input)="titleValue = title.value"
          />
          <button
            type="button"
            class="icon-btn"
            [class.active]="pinned()"
            [attr.aria-label]="pinned() ? 'Unpin note' : 'Pin note'"
            (click)="pinned.set(!pinned())"
          >
            <app-icon [name]="pinned() ? 'pin' : 'pin_off'" />
          </button>
        </div>
      }

      <textarea
        #text
        class="creator-text"
        placeholder="Take a note…"
        rows="1"
        [value]="contentValue"
        [style.background]="color()"
        (input)="onInput(text)"
        (focus)="expanded.set(true)"
      ></textarea>

      @if (expanded()) {
        <div class="actions">
          <div class="tool-row">
            <button
              type="button"
              class="icon-btn primary"
              [class.active]="paletteOpen()"
              aria-label="Background color"
              (click)="paletteOpen.set(!paletteOpen())"
            >
              <app-icon name="palette" />
            </button>
            <button
              type="button"
              class="icon-btn primary"
              [class.active]="archived()"
              aria-label="Archive note"
              (click)="archived.set(!archived())"
            >
              <app-icon name="archive" />
            </button>
            <button
              type="button"
              class="icon-btn primary"
              [class.active]="labelsOpen()"
              aria-label="Add label"
              (click)="labelsOpen.set(!labelsOpen())"
            >
              <app-icon name="add_label" />
            </button>
            <button
              type="button"
              class="icon-btn primary"
              [class.active]="templatesOpen()"
              aria-label="Templates"
              (click)="templatesOpen.set(!templatesOpen())"
            >
              <app-icon name="templates" />
            </button>
          </div>
          <button type="button" class="close-btn" (click)="close()">
            {{ titleValue || contentValue ? 'Done' : 'Close' }}
          </button>
        </div>

        @if (paletteOpen()) {
          <div class="panel">
            <app-color-picker [selected]="color()" (change)="color.set($event)" />
          </div>
        }

        @if (labelsOpen()) {
          <div class="panel label-panel">
            @for (label of notes.allLabels(); track label) {
              <button
                type="button"
                class="chip"
                [class.selected]="labels().includes(label)"
                (click)="toggleLabel(label)"
              >
                <app-icon name="label" />
                <span class="label">{{ label }}</span>
              </button>
            } @empty {
              <span class="muted">Create labels from the sidebar</span>
            }
          </div>
        }

        @if (templatesOpen()) {
          <div class="panel template-panel">
            @for (template of templates; track template.name) {
              <button
                type="button"
                class="template-item"
                [class.selected]="selectedTemplate() === template"
                (click)="applyTemplate(template)"
              >
                <app-icon [name]="templateIcon(template)" />
                <span>{{ template.name }}</span>
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class NoteCreator {
  protected readonly notes = inject(NotesService);
  protected readonly expanded = signal(false);
  protected readonly paletteOpen = signal(false);
  protected readonly labelsOpen = signal(false);
  protected readonly templatesOpen = signal(false);
  protected readonly pinned = signal(false);
  protected readonly archived = signal(false);
  protected readonly color = signal('');
  protected readonly labels = signal<string[]>([]);
  protected readonly selectedTemplate = signal<NoteTemplate | null>(null);
  protected readonly templates = NOTE_TEMPLATES;

  protected titleValue = '';
  protected contentValue = '';
  private textarea: HTMLTextAreaElement | null = null;

  private plainIcon: IconName = 'checklist';

  onInput(el: HTMLTextAreaElement): void {
    this.textarea = el;
    this.contentValue = el.value;
    this.autoGrow(el);
    this.expanded.set(true);
  }

  focus(): void {
    this.expanded.set(true);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>('note-creator textarea');
      el?.focus();
    }, 0);
  }

  templateIcon(template: NoteTemplate): IconName {
    return (template.icon as IconName) || this.plainIcon;
  }

  applyTemplate(template: NoteTemplate): void {
    this.titleValue = template.title;
    this.contentValue = template.content;
    this.selectedTemplate.set(template);
    this.expanded.set(true);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>('note-creator textarea');
      el?.focus();
      if (el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }
    }, 0);
  }

  autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  toggleLabel(label: string): void {
    this.labels.update((list) =>
      list.includes(label) ? list.filter((l) => l !== label) : [...list, label],
    );
  }

  close(): void {
    if (this.titleValue.trim() || this.contentValue.trim()) {
      this.notes.createNote({
        title: this.titleValue.trim(),
        content: this.contentValue.trim(),
        color: this.color(),
        labels: this.labels(),
        pinned: this.pinned(),
        archived: this.archived(),
        checklist: this.selectedTemplate()?.checklist ?? false,
      });
    }
    this.titleValue = '';
    this.contentValue = '';
    this.color.set('');
    this.pinned.set(false);
    this.archived.set(false);
    this.labels.set([]);
    this.selectedTemplate.set(null);
    this.expanded.set(false);
    this.paletteOpen.set(false);
    this.labelsOpen.set(false);
    this.templatesOpen.set(false);
    this.textarea = null;
  }
}