const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';
const AUTH_LOOKUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`;
const MAX_INPUT = 8000;
const verifiedTokens = new Map();

const PROMPTS = {
  summarize: (title, text) =>
    `You are a concise writing assistant for a notes app. Summarize the note below into its most important points. Use 3-6 short bullet points, each starting with "- ". Keep the same language as the note. Output only the bullets.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  continue: (title, text) =>
    `You are a writing assistant for a notes app. Continue the note below naturally from where it ends, keeping the same style, tone and language. Do not repeat any text that is already written. Output only the continuation.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  improve: (title, text) =>
    `You are an editing assistant for a notes app. Rewrite the note below to be clearer, better structured and more polished. Preserve every fact and stay in the same language. Output only the improved note.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  extract: (title, text) =>
    `You are a planning assistant for a notes app. Extract the action items or tasks from the note below. Return them as a checklist, one task per line, each line starting with "- [ ] ". Include only actionable tasks and nothing else.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  title: (title, text) =>
    `You are a writing assistant for a notes app. Generate a short, clear, descriptive title for the note below (max 8 words). ${title ? `The current title is "${title}" — improve or replace it if needed. ` : ''}Keep the same language as the note. Output only the title text with no quotes or punctuation at the end.\n\nNote:\n${text}`,
  fix: (title, text) =>
    `You are a proofreading assistant for a notes app. Correct grammar, spelling, and punctuation in the note below while preserving its meaning, tone, formatting, and language. Output only the corrected note.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  shorten: (title, text) =>
    `You are an editing assistant for a notes app. Rewrite the note below to be significantly shorter and more concise while keeping the key information and the same language. Output only the shortened note.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  tags: (title, text, labels) =>
    `You are an organization assistant for a notes app. Suggest up to 3 short labels for the note below. Prefer labels from this existing list: ${labels || 'none'}. Return only the labels separated by commas, with no bullets or explanation.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  organize: (title, text, labels) =>
    `You are an organization assistant for a notes app. Turn the note below into structured data. Prefer labels from this existing list: ${labels || 'none'}. Return ONLY valid JSON with this exact shape: {"title":"string","labels":["label"],"summary":"string","tasks":["task"]}. Keep 1-3 labels and 1-8 tasks. Keep the same language as the note. Do not include markdown fences.\n\n${title ? `Current title: ${title}\n` : ''}Note:\n${text}`,
  brainstorm: (title, text) =>
    `You are a creative assistant for a notes app. Brainstorm 5 practical, distinct ideas related to the note below. Return them as short bullet points, each starting with "- ". Keep the same language as the note. Output only the bullets.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  custom: (title, text, instruction) =>
    `You are a helpful writing assistant inside a notes app. Follow this user instruction: ${instruction || 'Improve the note.'}\nKeep the same language as the note and preserve facts unless the instruction says otherwise. Output only the final result, with no preamble.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
};

const TEMPERATURES = {
  summarize: 0.4,
  continue: 0.8,
  improve: 0.6,
  extract: 0.3,
  title: 0.5,
  fix: 0.2,
  shorten: 0.5,
  tags: 0.3,
  organize: 0.2,
  brainstorm: 0.9,
  custom: 0.6,
};

const ALLOWED_ACTIONS = new Set([
  'summarize',
  'continue',
  'improve',
  'extract',
  'title',
  'fix',
  'shorten',
  'tags',
  'organize',
  'brainstorm',
  'custom',
]);

const ok = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const authError = (code, status = 401) =>
  ok(
    {
      error: code,
      message: 'Sign in to KeepNote or add your own Gemini key in AI settings.',
    },
    status,
  );

const verifyFirebaseToken = async (token) => {
  if (!FIREBASE_WEB_API_KEY) return { ok: false, error: 'AI_AUTH_NOT_CONFIGURED' };
  if (!token || typeof token !== 'string' || token.length > 4096) {
    return { ok: false, error: 'AI_AUTH_REQUIRED' };
  }

  const cached = verifiedTokens.get(token);
  if (cached && cached.expires > Date.now()) return { ok: true, uid: cached.uid };

  try {
    const res = await fetch(AUTH_LOOKUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return { ok: false, error: 'AI_AUTH_REQUIRED' };

    const data = await res.json();
    const uid = data?.users?.[0]?.localId;
    if (!uid) return { ok: false, error: 'AI_AUTH_REQUIRED' };

    if (verifiedTokens.size > 1000) verifiedTokens.clear();
    verifiedTokens.set(token, { uid: String(uid), expires: Date.now() + 5 * 60 * 1000 });
    return { ok: true, uid: String(uid) };
  } catch {
    return { ok: false, error: 'AI_AUTH_REQUIRED' };
  }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: ok({}).headers, body: '' };
  }
  if (event.httpMethod !== 'POST') return ok({ error: 'Method not allowed' }, 405);

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return ok({ error: 'Invalid JSON body' }, 400);
  }

  const { action, title = '', content = '', instruction = '', labels = [] } = payload;
  if (!ALLOWED_ACTIONS.has(action)) return ok({ error: 'Unknown action' }, 400);

  const safeTitle = String(title).trim().slice(0, 300);
  const text = String(content).trim();
  const source = [safeTitle, text].filter(Boolean).join('\n');
  if (!source) return ok({ error: 'Note is empty' }, 400);

  const truncated = source.length > MAX_INPUT ? source.slice(0, MAX_INPUT) : source;
  const safeInstruction = String(instruction).replace(/\s+/g, ' ').trim().slice(0, 400);
  const safeLabels = Array.isArray(labels)
    ? labels.map((label) => String(label).trim().slice(0, 40)).filter(Boolean).slice(0, 20)
    : [];

  const headerKey = String(
    event.headers?.['x-gemini-api-key'] || event.headers?.['X-Gemini-Api-Key'] || '',
  )
    .trim()
    .slice(0, 256);
  const payloadKey = String(payload.apiKey || '')
    .trim()
    .slice(0, 256);
  const byoKey = headerKey || payloadKey;

  if (!byoKey) {
    const authorization = String(
      event.headers?.authorization || event.headers?.Authorization || '',
    );
    const idToken = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() || '';
    if (!idToken) return authError('AI_AUTH_REQUIRED');

    const auth = await verifyFirebaseToken(idToken);
    if (!auth.ok) {
      return authError(auth.error, auth.error === 'AI_AUTH_NOT_CONFIGURED' ? 500 : 401);
    }
  }

  const apiKey = byoKey || String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return ok({ error: 'AI_NOT_CONFIGURED' }, 500);

  const prompt = PROMPTS[action](safeTitle, truncated, safeInstruction || safeLabels.join(', '));

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: TEMPERATURES[action],
          maxOutputTokens: action === 'organize' ? 1200 : 1600,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Gemini error', res.status, detail.slice(0, 500));
      const message =
        res.status === 400 || res.status === 403
          ? 'Gemini request failed — check your API key'
          : 'Gemini request failed';
      return ok({ error: { status: res.status, message } }, 502);
    }

    const data = await res.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')?.trim() ?? '';

    if (!output) return ok({ error: 'Gemini returned an empty response' }, 502);
    return ok({ text: output });
  } catch (err) {
    console.error('ai function error', err);
    return ok({ error: 'Unexpected server error' }, 500);
  }
};
