const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
const MAX_INPUT = 6000;

const PROMPTS = {
  summarize: (title, text) =>
    `You are a concise writing assistant for a notes app. Summarize the note below into its most important points. Use 3-6 short bullet points, each starting with "- ". Keep the same language as the note. Output only the bullets.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  continue: (title, text) =>
    `You are a writing assistant for a notes app. Continue the note below naturally from where it ends, keeping the same style, tone and language. Do not repeat any text that is already written. Output only the continuation.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  improve: (title, text) =>
    `You are an editing assistant for a notes app. Rewrite the note below to be clearer, better structured and more polished. Preserve every fact and stay in the same language. Output only the improved note.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
  extract: (title, text) =>
    `You are a planning assistant for a notes app. Extract the action items or tasks from the note below. Return them as a checklist, one task per line, each line starting with "- [ ] ". Include only actionable tasks and nothing else.\n\n${title ? `Title: ${title}\n` : ''}Note:\n${text}`,
};

const TEMPERATURES = {
  summarize: 0.4,
  continue: 0.8,
  improve: 0.6,
  extract: 0.3,
};

const ALLOWED_ACTIONS = new Set(['summarize', 'continue', 'improve', 'extract']);

const ok = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: ok({}).headers, body: '' };
  }
  if (event.httpMethod !== 'POST') return ok({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return ok({ error: 'AI_NOT_CONFIGURED' }, 500);

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return ok({ error: 'Invalid JSON body' }, 400);
  }

  const { action, title = '', content = '' } = payload;
  if (!ALLOWED_ACTIONS.has(action)) return ok({ error: 'Unknown action' }, 400);

  const text = String(content).trim();
  if (!text) return ok({ error: 'Note is empty' }, 400);
  const truncated = text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text;

  const prompt = PROMPTS[action](String(title).trim(), truncated);

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
          maxOutputTokens: 1600,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Gemini error', res.status, detail.slice(0, 500));
      return ok({ error: { status: res.status, message: 'Gemini request failed' } }, 502);
    }

    const data = await res.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')?.trim() ?? '';

    if (!output) return ok({ error: 'Gemini returned an empty response' }, 502);
    return ok({ text: output });
  } catch (err) {
    console.error('ai function error', err);
    return ok({ error: 'Unexpected server error' }, 500);
  }
};