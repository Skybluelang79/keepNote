const STRIPE_API = 'https://api.stripe.com/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status, body) {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
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
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return respond(503, {
      code: 'PORTAL_NOT_CONFIGURED',
      error: 'Stripe billing portal is not configured yet.',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const customerId = typeof payload.customerId === 'string' ? payload.customerId : '';
    if (!customerId.startsWith('cus_')) {
      return respond(400, { error: 'A valid Stripe customer is required.' });
    }

    const origin = `${event.headers['x-forwarded-proto'] || 'https'}://${
      event.headers.host || 'localhost'
    }`;
    const fallback = safeUrl(`${origin}/`, `${origin}/`);
    const returnUrl = safeUrl(
      process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || payload.returnUrl,
      fallback,
    );

    const form = new URLSearchParams({ customer: customerId, return_url: returnUrl });
    const response = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    const session = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(session.error?.message || 'Stripe request failed');
    if (!session.url) throw new Error('Stripe did not return a billing portal URL.');

    return respond(200, { url: session.url });
  } catch (error) {
    return respond(500, {
      error: error instanceof Error ? error.message : 'Could not create billing portal session',
    });
  }
};
