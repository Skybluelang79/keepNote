import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import { AiService } from '../../services/ai.service';
import { NotesService } from '../../services/note.service';

@Component({
  selector: 'ai-settings-dialog',
  standalone: true,
  imports: [AppIcon],
  styleUrls: ['./ai-settings-dialog.component.css'],
  template: `
    @if (ai.settingsOpen()) {
      <div class="overlay" (click)="close()">
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-label="AI settings"
          (click)="$event.stopPropagation()"
        >
          <div class="panel-head">
            <div class="heading">
              <span class="heading-icon"><app-icon name="key" /></span>
              <h2>AI settings</h2>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" (click)="close()">
              <app-icon name="close" />
            </button>
          </div>
          <div class="panel-body">
            <p class="intro">
              KeepNote uses the deployed AI function first. Add your own Gemini API key to use AI
              before deploying, or when the function is not configured. The key is stored only in
              this browser and sent to the AI function for each request.
            </p>
            <label class="field-label" for="api-key">Gemini API key</label>
            <input
              id="api-key"
              class="key-input"
              type="password"
              autocomplete="off"
              placeholder="Paste your key…"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
              (keydown.enter)="save()"
            />
            <div class="status" [class.own]="ai.hasApiKey()">
              <span class="status-dot"></span>
              {{ status() }}
            </div>
          </div>
          <div class="panel-foot">
            <button type="button" class="ghost-btn" (click)="clear()">Clear key</button>
            <div class="foot-right">
              <button type="button" class="ghost-btn" (click)="close()">Cancel</button>
              <button type="button" class="save-btn" (click)="save()">Save</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AiSettingsDialog {
  protected readonly ai = inject(AiService);
  protected readonly notes = inject(NotesService);
  protected readonly draft = signal('');

  protected readonly status = computed(() =>
    this.ai.hasApiKey()
      ? 'Using your own Gemini key'
      : 'Using the deployed function, or offline smart actions',
  );

  constructor() {
    effect(() => {
      if (this.ai.settingsOpen()) this.draft.set(this.ai.apiKey());
    });
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    if (this.ai.settingsOpen() && !this.notes.commandPaletteOpen()) this.close();
  }

  protected save(): void {
    this.ai.setApiKey(this.draft());
    this.notes.showToast(this.ai.hasApiKey() ? 'AI key saved in this browser' : 'AI key cleared');
    this.close();
  }

  protected clear(): void {
    this.draft.set('');
    this.ai.clearApiKey();
    this.notes.showToast('AI key cleared');
    this.close();
  }

  protected close(): void {
    this.ai.settingsOpen.set(false);
  }
}
