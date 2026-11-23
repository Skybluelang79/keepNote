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

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(readStored());
  readonly background = signal<BackgroundId>(readBackground());
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
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }

  setBackground(id: BackgroundId): void {
    this.background.set(id);
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
