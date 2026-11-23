const STRIPE_API = 'https://api.stripe.com/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function respond(status, body) {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function prices() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_YEARLY || '',
  };
}

async function stripe(path, secret, init = {}) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Stripe request failed');
  return data;
}

function idOf(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function planFeatures(plan) {
  const shared = 'studio-backgrounds,ad-free,accent-themes';
  return plan === 'yearly' ? `${shared},note-history` : shared;
}

function safeUrl(value, fallback) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(204, {});

  const secret = process.env.STRIPE_SECRET_KEY;
  const configuredPrices = prices();
  if (!secret || !configuredPrices.monthly || !configuredPrices.yearly) {
    return respond(503, {
      code: 'CHECKOUT_NOT_CONFIGURED',
      error: 'Stripe checkout is not configured yet. Use Demo Premium to preview the upgrade.',
    });
  }

  try {
    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      const plan = payload.plan === 'yearly' ? 'yearly' : 'monthly';
      const origin = `${event.headers['x-forwarded-proto'] || 'https'}://${
        event.headers.host || 'localhost'
      }`;
      const fallback = safeUrl(`${origin}/`, `${origin}/`);
      let successUrl = safeUrl(payload.successUrl, `${fallback}?premium=success`);
      if (!successUrl.includes('{CHECKOUT_SESSION_ID}')) {
        successUrl += `${successUrl.includes('?') ? '&' : '?'}session={CHECKOUT_SESSION_ID}`;
      }
      const cancelUrl = safeUrl(payload.cancelUrl, `${fallback}?premium=cancel`);

      const form = new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': configuredPrices[plan],
        'line_items[0][quantity]': '1',
        success_url: successUrl,
        cancel_url: cancelUrl,
        'metadata[plan]': plan,
        'metadata[features]': planFeatures(plan),
        'subscription_data[metadata][plan]': plan,
        'subscription_data[metadata][features]': planFeatures(plan),
        allow_promotion_codes: 'true',
      });

      const session = await stripe('/checkout/sessions', secret, {
        method: 'POST',
        body: form,
      });
      return respond(200, { url: session.url, sessionId: session.id });
    }

    if (event.httpMethod === 'GET') {
      const sessionId = new URL(event.rawUrl || `https://localhost${event.path}`).searchParams.get(
        'session_id',
      );
      if (!sessionId) return respond(400, { error: 'Missing session_id' });

      const session = await stripe(
        `/checkout/sessions/${encodeURIComponent(sessionId)}`,
        secret,
        { method: 'GET', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      if (session.status !== 'complete') {
        return respond(200, { active: false, error: 'Checkout is not complete yet' });
      }

      let active = true;
      let expiresAt = null;
      if (session.subscription) {
        const subscription = await stripe(
          `/subscriptions/${encodeURIComponent(session.subscription)}`,
          secret,
          { method: 'GET', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
        active = subscription.status === 'active' || subscription.status === 'trialing';
        expiresAt = subscription.current_period_end
          ? subscription.current_period_end * 1000
          : null;
      }

      return respond(200, {
        active,
        plan: session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly',
        expiresAt,
        sessionId: session.id,
        customer: idOf(session.customer),
        subscription: idOf(session.subscription),
      });
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (error) {
    return respond(500, {
      error: error instanceof Error ? error.message : 'Checkout request failed',
    });
  }
};
