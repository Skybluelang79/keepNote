import { Injectable, Renderer2, RendererFactory2, effect, signal } from '@angular/core';

const THEME_KEY = 'keepnote.theme.v1';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(readStored());

  private readonly renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.apply(this.isDark());
    effect(() => this.apply(this.isDark()));
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }

  private apply(dark: boolean): void {
    this.renderer.setAttribute(document.documentElement, 'data-theme', dark ? 'dark' : 'light');
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }
}

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === 'dark';
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}