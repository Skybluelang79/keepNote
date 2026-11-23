import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { BackgroundId } from '../../models/premium.model';
import { NotesService } from '../../services/note.service';
import { PremiumService } from '../../services/premium.service';
import { ThemeService } from '../../services/theme.service';

export type AdVariant = 'box' | 'leaderboard';

interface AdCreative {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  image: string;
  theme: 'fizz' | 'peak' | 'nebula' | 'neon';
  background: BackgroundId;
  position: string;
}

const AD_CREATIVES: AdCreative[] = [
  {
    id: 'fizz',
    kicker: 'Fizz Studio',
    title: 'Sparkle in every frame.',
    text: 'A glossy 3D soda-bar world with bright bubbles and cinematic light.',
    cta: 'Use this look',
    image: 'bg-fizz.svg',
    theme: 'fizz',
    background: 'fizz',
    position: '72% 48%',
  },
  {
    id: 'peak',
    kicker: 'Peak Cream',
    title: 'Alpine fresh, animated.',
    text: 'A clean dairy-studio pour with soft peaks and slow-motion detail.',
    cta: 'Use this look',
    image: 'bg-peak.svg',
    theme: 'peak',
    background: 'peak-cream',
    position: '64% 50%',
  },
  {
    id: 'nebula',
    kicker: 'Nebula Drive',
    title: 'A deeper kind of focus.',
    text: 'Slow-moving navy space light with soft stars and flowing color.',
    cta: 'Use this look',
    image: 'bg-nebula.svg',
    theme: 'nebula',
    background: 'nebula',
    position: '68% 45%',
  },
  {
    id: 'neon',
    kicker: 'Neon Grove',
    title: 'Electric calm, in motion.',
    text: 'Vivid green light waves for notes that need a little energy.',
    cta: 'Use this look',
    image: 'bg-neon.svg',
    theme: 'neon',
    background: 'neon',
    position: '66% 48%',
  },
];

@Component({
  selector: 'app-ad-slot',
  standalone: true,
  imports: [],
  styleUrls: ['./ad-slot.component.css'],
  template: `
    <div class="ad-slot" [attr.data-variant]="variant()" role="complementary" aria-label="Advertisement space">
      <div class="ad-head">
        <span class="ad-label">Advertisement</span>
        <div class="ad-dots" role="group" aria-label="Choose advertisement">
          @for (creative of creatives; track creative.id; let i = $index) {
            <button
              type="button"
              class="ad-dot"
              [class.active]="i === index()"
              [attr.aria-label]="'Show ' + creative.kicker + ' advertisement'"
              [attr.aria-pressed]="i === index()"
              (click)="show(i)"
            ></button>
          }
        </div>
      </div>

      <div
        class="ad-box"
        [attr.data-theme]="creative().theme"
        (mouseenter)="paused.set(true)"
        (mouseleave)="paused.set(false)"
      >
        <img
          class="ad-art"
          [src]="creative().image"
          [style.object-position]="creative().position"
          alt=""
          aria-hidden="true"
        />
        <div class="ad-shade" aria-hidden="true"></div>
        <span class="ad-size">{{ sizeLabel() }}</span>
        <div class="ad-copy">
          <span class="ad-kicker">{{ creative().kicker }}</span>
          <strong class="ad-title">{{ creative().title }}</strong>
          <span class="ad-text">{{ creative().text }}</span>
        </div>
        <button type="button" class="ad-cta" (click)="useLook()">
          {{ creative().cta }}
        </button>
      </div>
    </div>
  `,
})
export class AdSlot implements OnInit, OnDestroy {
  readonly variant = input<AdVariant>('box');

  protected readonly creatives = AD_CREATIVES;
  protected readonly index = signal(0);
  protected readonly paused = signal(false);
  protected readonly creative = computed(() => this.creatives[this.index()]);

  private readonly notes = inject(NotesService);
  private readonly premium = inject(PremiumService);
  private readonly theme = inject(ThemeService);
  private timer: number | null = null;

  protected readonly sizeLabel = computed(() =>
    this.variant() === 'leaderboard' ? '728 × 90 · Leaderboard' : '300 × 250 · Medium rectangle',
  );

  ngOnInit(): void {
    this.timer = window.setInterval(() => {
      if (!this.paused()) this.next();
    }, 7000);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
  }

  protected show(index: number): void {
    this.index.set(index);
  }

  protected next(): void {
    this.index.set((this.index() + 1) % this.creatives.length);
  }

  protected useLook(): void {
    const current = this.creative();
    if (!this.premium.isPremium()) {
      this.premium.open('plans');
      return;
    }
    this.theme.setBackground(current.background);
    this.notes.showToast(`${current.kicker} background applied.`);
  }
}
