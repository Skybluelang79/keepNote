export type PremiumPlan = 'monthly' | 'yearly';
export type PremiumSource = 'demo' | 'stripe' | 'cloud';

export interface PremiumState {
  active: boolean;
  plan: PremiumPlan | null;
  source: PremiumSource | null;
  activatedAt: number | null;
  expiresAt: number | null;
  checkoutSessionId?: string | null;
}

export type BackgroundId =
  | 'professional'
  | 'soft-paper'
  | 'midnight'
  | 'fizz'
  | 'peak-cream'
  | 'aurora'
  | 'marble';

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
];

export function isBackgroundPremium(id: BackgroundId): boolean {
  return BACKGROUNDS.some((background) => background.id === id && background.premium);
}

export function isPremiumPlan(value: unknown): value is PremiumPlan {
  return value === 'monthly' || value === 'yearly';
}
