import { Component, Input, output } from '@angular/core';
import { NOTE_COLORS } from '../../models/note.model';
import { AppIcon } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [AppIcon],
  template: `
    <div class="colors" role="group" aria-label="Background color">
      @for (c of colors; track c.value) {
        <button
          type="button"
          class="swatch"
          [class.active]="c.value === selected"
          [class.default]="c.value === ''"
          [style.background]="c.value || 'var(--surface-2)'"
          [title]="c.name"
          [attr.aria-label]="c.name"
          (click)="select(c.value)"
        >
          @if (c.value === selected) {
            <app-icon name="check" />
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      .colors {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px;
      }
      .swatch {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 1px solid var(--border);
        display: grid;
        place-items: center;
        color: #202124;
        transition: transform 0.1s ease, box-shadow 0.15s ease;
        position: relative;
        outline: none;
      }
      .swatch:hover {
        transform: scale(1.15);
      }
      .swatch.active {
        box-shadow:
          0 0 0 2px var(--surface),
          0 0 0 3.5px var(--accent);
      }
      .swatch svg {
        width: 15px;
        height: 15px;
      }
    `,
  ],
})
export class ColorPicker {
  @Input() selected = '';
  readonly change = output<string>();
  protected readonly colors = NOTE_COLORS;

  select(value: string): void {
    this.selected = value;
    this.change.emit(value);
  }
}