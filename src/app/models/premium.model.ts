export type PremiumPlan = 'monthly' | 'yearly';
export type PremiumSource = 'demo' | 'stripe' | 'cloud';
export type PremiumFeature = 'studio-backgrounds' | 'ad-free' | 'accent-themes' | 'note-history';

export interface PremiumState {
  active: boolean;
  plan: PremiumPlan | null;
  source: PremiumSource | null;
  activatedAt: number | null;
  expiresAt: number | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}

export interface PremiumFeatureOption {
  id: PremiumFeature;
  name: string;
  description: string;
  badge: string;
}

export const PREMIUM_FEATURES: PremiumFeatureOption[] = [
  {
    id: 'studio-backgrounds',
    name: 'Studio backgrounds',
    description: 'Every cinematic and animated scene, including the new Pinterest-inspired motion looks.',
    badge: 'Both plans',
  },
  {
    id: 'ad-free',
    name: 'Ad-free workspace',
    description: 'Hide the promotional ad slots across notes, archive, trash and the sidebar.',
    badge: 'Both plans',
  },
  {
    id: 'accent-themes',
    name: 'Custom accent themes',
    description: 'Recolor buttons, highlights and focus states with five curated palettes.',
    badge: 'Both plans',
  },
  {
    id: 'note-history',
    name: 'Note version history',
    description: 'Roll a note back to an earlier saved version from the editor.',
    badge: 'Yearly',
  },
];

export const PLAN_FEATURES: Record<PremiumPlan, PremiumFeature[]> = {
  monthly: ['studio-backgrounds', 'ad-free', 'accent-themes'],
  yearly: ['studio-backgrounds', 'ad-free', 'accent-themes', 'note-history'],
};

export function hasPremiumFeature(state: PremiumState, feature: PremiumFeature): boolean {
  const active = state.active && (state.expiresAt === null || state.expiresAt > Date.now());
  return active && !!state.plan && PLAN_FEATURES[state.plan].includes(feature);
}


export type BackgroundId =
  | 'professional'
  | 'soft-paper'
  | 'midnight'
  | 'fizz'
  | 'peak-cream'
  | 'aurora'
  | 'marble'
  | 'nebula'
  | 'violet'
  | 'neon'
  | 'amber';

export interface BackgroundOption {
  id: BackgroundId;
  name: string;
  tagline: string;
  premium: boolean;
  swatch: string;
}

export const FREE_PREMIUM_STATE: PremiumState = {
  active: false,
  plan: null,
  source: null,
  activatedAt: null,
  expiresAt: null,
  checkoutSessionId: null,
  customerId: null,
  subscriptionId: null,
};

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'The original office hallway',
    premium: false,
    swatch: 'linear-gradient(135deg, #8e9aab, #d8dee8 48%, #6f7d91)',
  },
  {
    id: 'soft-paper',
    name: 'Soft Paper',
    tagline: 'Calm, clean and focused',
    premium: false,
    swatch: 'linear-gradient(135deg, #fbf7ef, #e9e0cf)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep blue evening light',
    premium: false,
    swatch: 'linear-gradient(135deg, #0b1020, #243252 60%, #4b3a72)',
  },
  {
    id: 'fizz',
    name: 'Fizz Studio',
    tagline: 'Glossy 3D soda-bar CGI',
    premium: true,
    swatch: 'radial-gradient(circle at 30% 25%, #ff9a6b, transparent 32%), linear-gradient(135deg, #7d0717, #e03a2f 52%, #ffc25c)',
  },
  {
    id: 'peak-cream',
    name: 'Peak Cream',
    tagline: '3D dairy-studio pour animation',
    premium: true,
    swatch: 'radial-gradient(circle at 32% 24%, #ffffff, transparent 34%), linear-gradient(135deg, #b9dcf2, #f7fbfd 48%, #d9a86f)',
  },
  {
    id: 'aurora',
    name: 'Aurora Glass',
    tagline: 'Liquid glass and neon light',
    premium: true,
    swatch: 'radial-gradient(circle at 70% 20%, #7ef0d0, transparent 35%), linear-gradient(135deg, #171554, #7048c8 55%, #ef6ea8)',
  },
  {
    id: 'marble',
    name: 'Liquid Marble',
    tagline: 'Slow-moving sculpted ink',
    premium: true,
    swatch: 'radial-gradient(circle at 20% 80%, #f7f4ee, transparent 30%), linear-gradient(135deg, #20242b, #6f7b8c 50%, #d9dde3)',
  },
  {
    id: 'nebula',
    name: 'Nebula Drive',
    tagline: 'Deep navy space motion',
    premium: true,
    swatch: 'radial-gradient(circle at 72% 24%, #8fd8ff, transparent 34%), linear-gradient(135deg, #030715, #081b3d 48%, #102f63)',
  },
  {
    id: 'violet',
    name: 'Violet Haze',
    tagline: 'Purple nebula glow',
    premium: true,
    swatch: 'radial-gradient(circle at 28% 24%, #f5d0fe, transparent 34%), linear-gradient(135deg, #16052f, #4c1d95 52%, #db2777)',
  },
  {
    id: 'neon',
    name: 'Neon Grove',
    tagline: 'Electric green light waves',
    premium: true,
    swatch: 'radial-gradient(circle at 74% 22%, #d9f99d, transparent 34%), linear-gradient(135deg, #02150f, #064e3b 50%, #65a30d)',
  },
  {
    id: 'amber',
    name: 'Amber Wave',
    tagline: 'Warm sunset motion',
    premium: true,
    swatch: 'radial-gradient(circle at 76% 24%, #fff7c2, transparent 32%), linear-gradient(135deg, #1c0a04, #9a3412 52%, #fbbf24)',
  },
];

export function isBackgroundPremium(id: BackgroundId): boolean {
  return BACKGROUNDS.some((background) => background.id === id && background.premium);
}

export function isPremiumPlan(value: unknown): value is PremiumPlan {
  return value === 'monthly' || value === 'yearly';
}
