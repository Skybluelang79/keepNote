import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIcon } from '../app-icon/app-icon.component';
import { AdSlot } from '../ad-slot/ad-slot.component';
import { NotesService, View } from '../../services/note.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AppIcon, AdSlot, NgClass, FormsModule],
  styleUrls: ['./app-sidebar.component.css'],
  template: `
    <aside class="sidebar">
      <nav class="nav">
        @for (item of items; track item.id) {
          <button
            type="button"
            class="nav-item"
            [ngClass]="{ active: notes.view() === item.id && !notes.activeLabel() }"
            [attr.aria-current]="notes.view() === item.id ? 'page' : null"
            (click)="notes.setView(item.id)"
          >
            <span class="nav-icon"><app-icon [name]="item.icon" /></span>
            <span class="nav-label">{{ item.label }}</span>
            @if (badge(item.id) > 0) {
              <span class="nav-badge">{{ badge(item.id) }}</span>
            }
          </button>
        }
      </nav>

      <div class="labels-section">
        <div class="labels-head">
          <span class="labels-title">Labels</span>
          <button
            type="button"
            class="icon-btn small"
            aria-label="Create label"
            (click)="editing.set(true)"
          >
            <app-icon name="add" />
          </button>
        </div>

        @if (editing()) {
          <form class="label-form" (submit)="submitLabel()">
            <input
              #labelInput
              type="text"
              name="label"
              placeholder="New label name…"
              [(ngModel)]="newLabel"
              (focusout)="submitLabel(true)"
              (keydown.escape)="cancelLabel()"
              autofocus
            />
            <button type="submit" class="icon-btn small" aria-label="Save label">
              <app-icon name="check" />
            </button>
          </form>
        }

        <div class="labels-list">
          @for (label of notes.allLabels(); track label; let first = $first) {
            <button
              type="button"
              class="nav-item"
              [ngClass]="{ active: notes.activeLabel() === label }"
              [attr.aria-current]="notes.view() === 'notes' && notes.activeLabel() === label ? 'page' : null"
              (click)="selectLabel(label)"
            >
              <span class="nav-icon"><app-icon name="label" /></span>
              <span class="nav-label">{{ label }}</span>
            </button>
          } @empty {
            <p class="labels-empty">No labels yet</p>
          }
        </div>
      </div>

      <footer class="sidebar-foot">
        <app-ad-slot variant="box" />
        <span class="foot-note">KeepNote · Local-first</span>
      </footer>
    </aside>
  `,
})
export class AppSidebar {
  protected readonly notes = inject(NotesService);
  protected readonly editing = signal(false);
  protected newLabel = '';

  protected readonly items: { id: View; label: string; icon: 'lightbulb' | 'archive' | 'delete' }[] = [
    { id: 'notes', label: 'Notes', icon: 'lightbulb' },
    { id: 'archive', label: 'Archive', icon: 'archive' },
    { id: 'trash', label: 'Trash', icon: 'delete' },
  ];

  selectLabel(label: string): void {
    this.notes.setView('notes');
    this.notes.setActiveLabel(label);
  }

  badge(view: View): number {
    return view === 'archive'
      ? this.notes.archiveCount()
      : view === 'trash'
        ? this.notes.trashCount()
        : this.notes.noteCount();
  }

  submitLabel(force = false): void {
    const value = this.newLabel.trim();
    if (force && !value) {
      this.editing.set(false);
      return;
    }
    if (!value) return;
    this.notes.createLabel(value);
    this.newLabel = '';
    this.editing.set(false);
  }

  cancelLabel(): void {
    this.newLabel = '';
    this.editing.set(false);
  }
}