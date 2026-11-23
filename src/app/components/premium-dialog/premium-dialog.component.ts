import { Component, computed, inject } from '@angular/core';
import { AppIcon } from '../app-icon/app-icon.component';
import {
  BACKGROUNDS,
  BackgroundId,
  PremiumPlan,
  isBackgroundPremium,
} from '../../models/premium.model';
import { PremiumService } from '../../services/premium.service';
import { ThemeService } from '../../services/theme.service';

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
          </div>

          @if (premium.tab() === 'plans') {
            <div class="panel-body">
              @if (premium.isPremium()) {
                <div class="active-banner">
                  <div>
                    <strong>Premium is active</strong>
                    <span>{{ planLabel() }} · {{ sourceLabel() }}</span>
                  </div>
                  <button type="button" class="soft-btn" (click)="premium.open('backgrounds')">
                    Pick a background
                  </button>
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
          } @else {
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
