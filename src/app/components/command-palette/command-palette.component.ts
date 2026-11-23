import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { AppIcon, IconName } from '../app-icon/app-icon.component';
import { NotesService } from '../../services/note.service';
import { ThemeService } from '../../services/theme.service';
import { AiService } from '../../services/ai.service';
import { PremiumService } from '../../services/premium.service';

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

@Component({
  selector: 'command-palette',
  standalone: true,
  imports: [AppIcon],
  styleUrls: ['./command-palette.component.css'],
  template: `
    @if (notes.commandPaletteOpen()) {
      <div class="overlay" (click)="close()">
        <div
          class="palette"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          (click)="$event.stopPropagation()"
        >
          <div class="search-row">
            <app-icon name="command" />
            <input
              class="command-input"
              type="text"
              placeholder="Type a command…"
              [value]="query()"
              (input)="onQuery($any($event.target).value)"
              aria-label="Search commands"
            />
            <kbd>Esc</kbd>
          </div>
          <div class="results">
            @for (command of filtered(); track command.id; let i = $index) {
              <button
                type="button"
                class="result"
                [class.active]="i === activeIndex()"
                (mouseenter)="activeIndex.set(i)"
                (click)="runCommand(command)"
              >
                <app-icon [name]="command.icon" />
                <span class="result-label">{{ command.label }}</span>
                <span class="result-hint">{{ command.hint }}</span>
              </button>
            } @empty {
              <div class="empty">No commands found</div>
            }
          </div>
          <div class="palette-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> run</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPalette {
  protected readonly notes = inject(NotesService);
  protected readonly theme = inject(ThemeService);
  protected readonly ai = inject(AiService);
  protected readonly premium = inject(PremiumService);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  protected readonly commands: Command[] = [
    {
      id: 'new',
      label: 'New note',
      hint: 'Create a blank note',
      icon: 'add',
      run: () => this.newNote(),
    },
    {
      id: 'search',
      label: 'Search notes',
      hint: 'Focus the search box',
      icon: 'search',
      run: () => this.focusSearch(),
    },
    {
      id: 'theme',
      label: 'Toggle theme',
      hint: 'Light / dark mode',
      icon: 'dark_mode',
      run: () => this.theme.toggle(),
    },
    {
      id: 'notes',
      label: 'Go to Notes',
      hint: 'Show active notes',
      icon: 'empty_notes',
      run: () => this.notes.setView('notes'),
    },
    {
      id: 'archive',
      label: 'Go to Archive',
      hint: 'Show archived notes',
      icon: 'archive',
      run: () => this.notes.setView('archive'),
    },
    {
      id: 'trash',
      label: 'Go to Trash',
      hint: 'Show deleted notes',
      icon: 'empty_trash',
      run: () => this.notes.setView('trash'),
    },
    {
      id: 'focus',
      label: 'Toggle focus mode',
      hint: 'Distraction-free editor',
      icon: 'fullscreen',
      run: () => {
        if (this.notes.editingNote()) this.notes.toggleFocusMode();
        else this.notes.showToast('Open a note first');
      },
    },
    {
      id: 'select',
      label: 'Select notes',
      hint: 'Bulk actions',
      icon: 'select',
      run: () => this.notes.startSelecting(),
    },
    {
      id: 'layout',
      label: 'Toggle layout',
      hint: 'Grid / list view',
      icon: 'grid',
      run: () => this.notes.setLayout(this.notes.layout() === 'cards' ? 'list' : 'cards'),
    },
    {
      id: 'ai-settings',
      label: 'AI settings',
      hint: 'Add your own Gemini key',
      icon: 'key',
      run: () => this.ai.settingsOpen.set(true),
    },
    {
      id: 'export-json',
      label: 'Export all notes',
      hint: 'Download JSON backup',
      icon: 'download',
      run: () =>
        this.notes.download(
          `keepnote-${dateStamp()}.json`,
          this.notes.exportJson(),
          'application/json',
        ),
    },
    {
      id: 'export-md',
      label: 'Export Markdown',
      hint: 'Download all notes as .md',
      icon: 'checklist',
      run: () =>
        this.notes.download(
          `keepnote-${dateStamp()}.md`,
          this.notes
            .notes()
            .filter((note) => !note.trashed)
            .map((note) => this.notes.exportMarkdown(note))
            .join('\n\n'),
          'text/markdown',
        ),
    },
    {
      id: 'premium',
      label: 'Premium plans',
      hint: 'Monthly and yearly subscriptions',
      icon: 'sparkle',
      run: () => this.premium.open('plans'),
    },
    {
      id: 'backgrounds',
      label: 'Change background',
      hint: 'Free and premium studio scenes',
      icon: 'palette',
      run: () => this.premium.open('backgrounds'),
    },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      hint: 'See all shortcuts',
      icon: 'flash',
      run: () => this.notes.shortcutsOpen.set(true),
    },
  ];

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) || command.hint.toLowerCase().includes(q),
    );
  });

  constructor() {
    effect(() => {
      if (this.notes.commandPaletteOpen()) {
        this.query.set('');
        this.activeIndex.set(0);
        window.setTimeout(() => {
          document.querySelector<HTMLInputElement>('.command-input')?.focus();
        }, 0);
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.notes.commandPaletteOpen()) return;
    const count = this.filtered().length;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set(count ? (this.activeIndex() + 1) % count : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(count ? (this.activeIndex() - 1 + count) % count : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.runActive();
    }
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  protected runCommand(command: Command): void {
    this.close();
    window.setTimeout(() => command.run(), 0);
  }

  protected runActive(): void {
    const command = this.filtered()[this.activeIndex()];
    if (command) this.runCommand(command);
  }

  protected close(): void {
    this.notes.commandPaletteOpen.set(false);
  }

  private newNote(): void {
    this.notes.closeNote();
    this.notes.setView('notes');
    this.notes.setActiveLabel(null);
    this.notes.setQuery('');
    this.notes.stopSelecting();
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('note-creator textarea')?.focus();
    }, 0);
  }

  private focusSearch(): void {
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('.search-input')?.focus();
    }, 0);
  }
}

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
