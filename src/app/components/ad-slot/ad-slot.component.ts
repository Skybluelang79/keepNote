import { Component, computed, input } from '@angular/core';

export type AdVariant = 'box' | 'leaderboard';

@Component({
  selector: 'app-ad-slot',
  standalone: true,
  imports: [],
  styleUrls: ['./ad-slot.component.css'],
  template: `
    <div class="ad-slot" [attr.data-variant]="variant()" role="complementary" aria-label="Advertisement space">
      <span class="ad-label">Advertisement</span>
      <div class="ad-box">
        <span class="ad-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M23 18V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zM8.5 11.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
            />
          </svg>
        </span>
        <span class="ad-title">Your ad here</span>
        <span class="ad-size">{{ sizeLabel() }}</span>
      </div>
    </div>
  `,
})
export class AdSlot {
  readonly variant = input<AdVariant>('box');

  protected readonly sizeLabel = computed(() =>
    this.variant() === 'leaderboard' ? '728 × 90 · Leaderboard' : '300 × 250 · Medium rectangle',
  );
}