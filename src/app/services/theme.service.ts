import {
  Injectable,
  Renderer2,
  RendererFactory2,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { BACKGROUNDS, BackgroundId, isBackgroundPremium } from '../models/premium.model';
import { PremiumService } from './premium.service';

const THEME_KEY = 'keepnote.theme.v1';
const BACKGROUND_KEY = 'keepnote.background.v1';
const ACCENT_KEY = 'keepnote.accent.v1';

export type Theme = 'light' | 'dark';
export type AccentId = 'violet' | 'sunset' | 'ocean' | 'forest' | 'rose';

export const ACCENTS: { id: AccentId; name: string; swatch: string }[] = [
  { id: 'violet', name: 'Violet', swatch: 'linear-gradient(135deg, #7c4dff, #f06ea9)' },
  { id: 'sunset', name: 'Sunset', swatch: 'linear-gradient(135deg, #e03a2f, #ff9a3c)' },
  { id: 'ocean', name: 'Ocean', swatch: 'linear-gradient(135deg, #0284c7, #22d3ee)' },
  { id: 'forest', name: 'Forest', swatch: 'linear-gradient(135deg, #15803d, #84cc16)' },
  { id: 'rose', name: 'Rose', swatch: 'linear-gradient(135deg, #be123c, #fb7185)' },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(readStored());
  readonly background = signal<BackgroundId>(readBackground());
  readonly accent = signal<AccentId>(readAccent());
  readonly effectiveBackground = computed<BackgroundId>(() => {
    const requested = this.background();
    return this.premium.isPremium() || !isBackgroundPremium(requested)
      ? requested
      : 'professional';
  });

  private readonly renderer: Renderer2;
  private readonly premium = inject(PremiumService);

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.apply(this.isDark());
    effect(() => this.apply(this.isDark()));
    effect(() => {
      const id = this.effectiveBackground();
      this.renderer.setAttribute(document.documentElement, 'data-background', id);
      try {
        localStorage.setItem(BACKGROUND_KEY, this.background());
      } catch {}
    });
    effect(() => {
      const accent = this.accent();
      this.renderer.setAttribute(document.documentElement, 'data-accent', accent);
      try {
        localStorage.setItem(ACCENT_KEY, accent);
      } catch {}
    });
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }

  setBackground(id: BackgroundId): void {
    this.background.set(id);
  }

  setAccent(id: AccentId): void {
    this.accent.set(id);
  }

  private apply(dark: boolean): void {
    this.renderer.setAttribute(document.documentElement, 'data-theme', dark ? 'dark' : 'light');
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {}
  }
}

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === 'dark';
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function readBackground(): BackgroundId {
  try {
    const stored = localStorage.getItem(BACKGROUND_KEY);
    if (stored && BACKGROUNDS.some((background) => background.id === stored)) {
      return stored as BackgroundId;
    }
  } catch {}
  return 'professional';
}

function readAccent(): AccentId {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored && ACCENTS.some((accent) => accent.id === stored)) {
      return stored as AccentId;
    }
  } catch {}
  return 'violet';
}
