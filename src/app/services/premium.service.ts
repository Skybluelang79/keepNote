import {
  Injectable,
  Renderer2,
  RendererFactory2,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FREE_PREMIUM_STATE,
  PLAN_FEATURES,
  PremiumFeature,
  PremiumPlan,
  PremiumState,
  hasPremiumFeature,
  isPremiumPlan,
} from '../models/premium.model';

const PREMIUM_KEY = 'keepnote.premium.v1';

interface CheckoutResponse {
  url?: string;
  error?: string;
  active?: boolean;
  plan?: PremiumPlan;
  expiresAt?: number | null;
  sessionId?: string;
  customer?: string | null;
  subscription?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PremiumService {
  readonly state = signal<PremiumState>(readState());
  readonly isPremium = computed(() => {
    const state = this.state();
    return state.active && (state.expiresAt === null || state.expiresAt > Date.now());
  });
  readonly isPaid = computed(() => {
    const state = this.state();
    return (
      this.isPremium() && (state.source === 'stripe' || state.source === 'cloud')
    );
  });
  readonly showAds = computed(() => !this.isPaid());
  readonly settingsOpen = signal(false);
  readonly tab = signal<'plans' | 'backgrounds' | 'features'>('plans');
  readonly features = computed<PremiumFeature[]>(() => {
    const plan = this.state().plan;
    return plan ? PLAN_FEATURES[plan] : [];
  });
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  private readonly renderer: Renderer2;
  private readonly listeners = new Set<() => void>();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    effect(() => {
      this.renderer.setAttribute(
        document.documentElement,
        'data-premium',
        this.isPremium() ? 'true' : 'false',
      );
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('premium') === 'success' && params.get('session')) {
        void this.completeCheckout(params.get('session')!);
      } else if (params.get('premium') === 'cancel') {
        this.notice.set('Checkout was cancelled. Your notes are unchanged.');
        this.cleanUrl();
      }
    }
  }

  hasFeature(feature: PremiumFeature): boolean {
    return hasPremiumFeature(this.state(), feature);
  }

  open(tab: 'plans' | 'backgrounds' | 'features' = 'plans'): void {
    this.tab.set(tab);
    this.error.set('');
    this.settingsOpen.set(true);
  }

  close(): void {
    this.settingsOpen.set(false);
  }

  activateDemo(plan: PremiumPlan = 'monthly'): void {
    this.state.set({
      active: true,
      plan,
      source: 'demo',
      activatedAt: Date.now(),
      expiresAt: null,
      checkoutSessionId: null,
    });
    this.error.set('');
    this.notice.set('Demo Premium is on — enjoy every background. No payment was taken.');
    this.persist();
  }

  deactivate(): void {
    this.state.set({ ...FREE_PREMIUM_STATE });
    this.error.set('');
    this.notice.set('Premium is off. Your notes and free backgrounds are still here.');
    this.persist();
  }

  adoptCloud(remote: PremiumState | null | undefined): void {
    if (!remote || typeof remote !== 'object' || !remote.active) return;
    const local = this.state();
    if ((remote.activatedAt ?? 0) < (local.activatedAt ?? 0)) return;
    if (local.active && local.source === 'stripe' && remote.source !== 'stripe') return;
    this.state.set(normalize(remote));
    this.persist();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startCheckout(plan: PremiumPlan): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const here = `${window.location.origin}${window.location.pathname}`;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          successUrl: `${here}?premium=success&session={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${here}?premium=cancel`,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as CheckoutResponse;
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Stripe checkout is not available yet.');
      }
      window.location.href = data.url;
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Could not start checkout. Try demo mode instead.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  async completeCheckout(sessionId: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await fetch(
        `/api/checkout?session_id=${encodeURIComponent(sessionId)}`,
      );
      const data = (await response.json().catch(() => ({}))) as CheckoutResponse;
      if (!response.ok || !data.active) {
        throw new Error(data.error ?? 'That checkout session is not active yet.');
      }
      this.state.set({
        active: true,
        plan: data.plan ?? 'monthly',
        source: 'stripe',
        activatedAt: Date.now(),
        expiresAt: data.expiresAt ?? null,
        checkoutSessionId: sessionId,
        customerId: data.customer ?? null,
        subscriptionId: data.subscription ?? null,
      });
      this.notice.set('Premium is active. Thank you for supporting KeepNote!');
      this.persist();
      this.cleanUrl();
      this.open('backgrounds');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Could not confirm the subscription.',
      );
      this.cleanUrl();
      this.open('plans');
    } finally {
      this.busy.set(false);
    }
  }

  async manageSubscription(): Promise<void> {
    const customerId = this.state().customerId;
    if (!customerId) {
      this.error.set('Billing management is available after a Stripe checkout.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, returnUrl: window.location.origin + window.location.pathname }),
      });
      const data = (await response.json().catch(() => ({}))) as CheckoutResponse;
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Stripe billing portal is not available yet.');
      }
      window.location.href = data.url;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not open billing settings.');
    } finally {
      this.busy.set(false);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(PREMIUM_KEY, JSON.stringify(this.state()));
    } catch {}
    for (const listener of this.listeners) listener();
  }

  private cleanUrl(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('premium');
    url.searchParams.delete('session');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
}

function readState(): PremiumState {
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<PremiumState>);
  } catch {}
  return { ...FREE_PREMIUM_STATE };
}

function normalize(value: Partial<PremiumState>): PremiumState {
  const active = Boolean(value.active);
  const plan = isPremiumPlan(value.plan) ? value.plan : 'monthly';
  return {
    active,
    plan: active ? plan : null,
    source: value.source === 'stripe' || value.source === 'cloud' || value.source === 'demo'
      ? value.source
      : null,
    activatedAt: typeof value.activatedAt === 'number' ? value.activatedAt : null,
    expiresAt: typeof value.expiresAt === 'number' ? value.expiresAt : null,
    checkoutSessionId: typeof value.checkoutSessionId === 'string' ? value.checkoutSessionId : null,
    customerId: typeof value.customerId === 'string' ? value.customerId : null,
    subscriptionId: typeof value.subscriptionId === 'string' ? value.subscriptionId : null,
  };
}
