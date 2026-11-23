import { Component, computed, inject } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import {
  BACKGROUNDS,
  PLAN_FEATURES,
  PREMIUM_FEATURES,
  BackgroundId,
  PremiumFeature,
  PremiumPlan,
  isBackgroundPremium,
} from '../../models/premium.model';
import { PremiumService } from '../../services/premium.service';
import { AccentId, ACCENTS, ThemeService } from '../../services/theme.service';

@Component({
  selector: 'premium-dialog',
  standalone: true,
  imports: [AppIcon],
  styleUrls: ['./premium-dialog.component.css'],
  template: `
    @if (premium.settingsOpen()) {
      <div class="overlay" (click)="premium.close()">
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-label="KeepNote Premium"
          (click)="$event.stopPropagation()"
        >
          <div class="panel-head">
            <div class="head-title">
              <span class="pro-mark">PRO</span>
              <div>
                <h2>KeepNote Premium</h2>
                <p>A small monthly change. A beautiful everyday upgrade.</p>
              </div>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" (click)="premium.close()">
              <app-icon name="close" />
            </button>
          </div>

          @if (premium.notice()) {
            <div class="notice">{{ premium.notice() }}</div>
          }
          @if (premium.error()) {
            <div class="error">{{ premium.error() }}</div>
          }

          <div class="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              [class.active]="premium.tab() === 'plans'"
              (click)="premium.tab.set('plans')"
            >
              Plans
            </button>
            <button
              type="button"
              role="tab"
              [class.active]="premium.tab() === 'backgrounds'"
              (click)="premium.tab.set('backgrounds')"
            >
              Backgrounds
            </button>
            <button
              type="button"
              role="tab"
              [class.active]="premium.tab() === 'features'"
              (click)="premium.tab.set('features')"
            >
              Features
            </button>
          </div>

          @if (premium.tab() === 'plans') {
            <div class="panel-body">
              @if (premium.isPremium()) {
                <div class="active-banner">
                  <div>
                    <strong>Premium is active</strong>
                    <span>{{ planLabel() }} · {{ sourceLabel() }}</span>
                  </div>
                  <div class="banner-actions">
                    @if (premium.state().source === 'stripe' && premium.state().customerId) {
                      <button
                        type="button"
                        class="soft-btn"
                        [disabled]="premium.busy()"
                        (click)="premium.manageSubscription()"
                      >
                        Manage billing
                      </button>
                    }
                    <button type="button" class="soft-btn" (click)="premium.open('backgrounds')">
                      Pick a background
                    </button>
                  </div>
                </div>
              }

              <div class="plan-grid">
                @for (plan of plans; track plan.id) {
                  <article class="plan-card" [class.featured]="plan.featured">
                    @if (plan.featured) {
                      <span class="ribbon">BEST VALUE</span>
                    }
                    <h3>{{ plan.name }}</h3>
                    <div class="price"><strong>{{ plan.price }}</strong><span>/ {{ plan.period }}</span></div>
                    <p>{{ plan.description }}</p>
                    <ul class="plan-features">
                      @for (feature of planFeatureNames(plan.id); track feature) {
                        <li><span>✓</span>{{ feature }}</li>
                      }
                    </ul>
                    <button
                      type="button"
                      class="plan-btn"
                      [disabled]="premium.busy()"
                      (click)="premium.startCheckout(plan.id)"
                    >
                      {{ premium.busy() ? 'Opening checkout…' : plan.cta }}
                    </button>
                  </article>
                }
              </div>

              <div class="perks">
                <div class="perk"><span>✦</span><div><strong>Studio backgrounds</strong><small>Switch between cinematic, glossy 3D scenes whenever you like.</small></div></div>
                <div class="perk"><span>✦</span><div><strong>Rich formatting everywhere</strong><small>Bold, italic, highlights, lists and quotes stay free for everyone.</small></div></div>
                <div class="perk"><span>✦</span><div><strong>Cancel any time</strong><small>Your notes always export as plain Markdown — no lock-in.</small></div></div>
              </div>

              <div class="demo-row">
                <div>
                  <strong>Just looking?</strong>
                  <span>Try every premium background locally, with no payment.</span>
                </div>
                <div class="demo-actions">
                  <button type="button" class="soft-btn" (click)="premium.activateDemo('monthly')">
                    Try demo
                  </button>
                  @if (premium.isPremium()) {
                    <button type="button" class="text-btn" (click)="premium.deactivate()">
                      Turn off
                    </button>
                  }
                </div>
              </div>
            </div>
          } @else if (premium.tab() === 'backgrounds') {
            <div class="panel-body backgrounds-body">
              <p class="body-intro">
                Set the mood behind your notes. Free backgrounds work for everyone; premium scenes
                unlock with an active subscription.
              </p>
              <div class="background-grid">
                @for (background of backgrounds; track background.id) {
                  <button
                    type="button"
                    class="background-card"
                    [class.active]="activeBackground() === background.id"
                    [class.locked]="background.premium && !premium.isPremium()"
                    (click)="chooseBackground(background.id)"
                  >
                    <span class="swatch" [style.background]="background.swatch">
                      @if (background.premium && !premium.isPremium()) {
                        <span class="lock">PRO</span>
                      }
                      @if (activeBackground() === background.id) {
                        <span class="applied"><app-icon name="check" /></span>
                      }
                    </span>
                    <strong>{{ background.name }}</strong>
                    <small>{{ background.tagline }}</small>
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="panel-body features-body">
              <p class="body-intro">
                Premium changes how KeepNote works, not just how it looks. Both paid plans unlock the
                studio effects and an ad-free workspace; yearly adds note version history.
              </p>

              <div class="feature-list">
                @for (feature of featureCatalog; track feature.id) {
                  <article class="feature-card" [class.live]="hasFeature(feature.id)">
                    <div class="feature-icon">{{ hasFeature(feature.id) ? '✓' : '✦' }}</div>
                    <div class="feature-copy">
                      <div class="feature-title">
                        <strong>{{ feature.name }}</strong>
                        <span>{{ feature.badge }}</span>
                      </div>
                      <p>{{ feature.description }}</p>
                    </div>
                  </article>
                }
              </div>

              <div class="accent-section">
                <div class="accent-head">
                  <div>
                    <strong>Accent themes</strong>
                    <span>Recolor the app controls and highlights.</span>
                  </div>
                  @if (!hasFeature('accent-themes')) {
                    <button type="button" class="text-btn" (click)="premium.open('plans')">
                      Unlock
                    </button>
                  }
                </div>
                <div class="accent-grid">
                  @for (accent of accents; track accent.id) {
                    <button
                      type="button"
                      class="accent-card"
                      [class.active]="activeAccent() === accent.id"
                      [class.locked]="!hasFeature('accent-themes')"
                      (click)="chooseAccent(accent.id)"
                    >
                      <span class="accent-swatch" [style.background]="accent.swatch"></span>
                      <span>{{ accent.name }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <div class="panel-foot">
            <span>Notes stay local-first — premium only changes the look.</span>
            <button type="button" class="done-btn" (click)="premium.close()">Done</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PremiumDialog {
  protected readonly premium = inject(PremiumService);
  protected readonly theme = inject(ThemeService);
  protected readonly backgrounds = BACKGROUNDS;
  protected readonly activeBackground = computed(() => this.theme.effectiveBackground());
  protected readonly featureCatalog = PREMIUM_FEATURES;
  protected readonly accents = ACCENTS;
  protected readonly activeAccent = computed(() => this.theme.accent());
  protected readonly plans: Array<{
    id: PremiumPlan;
    name: string;
    price: string;
    period: string;
    description: string;
    cta: string;
    featured: boolean;
  }> = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$3',
      period: 'month',
      description: 'A little each month for a workspace that feels made for you.',
      cta: 'Choose monthly',
      featured: false,
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$24',
      period: 'year',
      description: 'Two months free. Lock in the premium studio look all year.',
      cta: 'Choose yearly',
      featured: true,
    },
  ];

  chooseBackground(id: BackgroundId): void {
    const option = BACKGROUNDS.find((background) => background.id === id);
    if (!option) return;
    if (isBackgroundPremium(id) && !this.premium.isPremium()) {
      this.premium.notice.set('That background is premium. Choose a plan or try demo mode.');
      this.premium.tab.set('plans');
      return;
    }
    this.theme.setBackground(id);
    this.premium.notice.set(`${option.name} background applied.`);
  }

  planFeatureNames(plan: PremiumPlan): string[] {
    return PLAN_FEATURES[plan]
      .map((id) => PREMIUM_FEATURES.find((feature) => feature.id === id)?.name)
      .filter((name): name is string => !!name);
  }

  hasFeature(feature: PremiumFeature): boolean {
    return this.premium.hasFeature(feature);
  }

  chooseAccent(id: AccentId): void {
    if (!this.hasFeature('accent-themes')) {
      this.premium.notice.set('Accent themes are included with KeepNote Premium.');
      this.premium.open('plans');
      return;
    }
    this.theme.setAccent(id);
    const accent = ACCENTS.find((option) => option.id === id);
    this.premium.notice.set(`${accent?.name ?? 'Custom'} accent applied.`);
  }

  planLabel(): string {
    return this.premium.state().plan === 'yearly' ? 'Yearly plan' : 'Monthly plan';
  }

  sourceLabel(): string {
    const source = this.premium.state().source;
    if (source === 'stripe') return 'Stripe subscription';
    if (source === 'cloud') return 'Synced subscription';
    return 'Local demo';
  }
}
