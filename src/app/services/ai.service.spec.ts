import { AiService } from './ai.service';

const STORAGE_KEY = 'keepnote.ai.key.v1';

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    service = new AiService();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('persists and clears the API key locally', () => {
    service.setApiKey('  test-key  ');

    expect(service.apiKey()).toBe('test-key');
    expect(service.hasApiKey()).toBeTrue();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('test-key');

    service.clearApiKey();

    expect(service.apiKey()).toBe('');
    expect(service.hasApiKey()).toBeFalse();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('uses the offline fallback when the AI endpoint is unavailable', async () => {
    spyOn(window, 'fetch').and.rejectWith(new Error('offline'));

    const result = await service.generate({
      action: 'summarize',
      title: 'Launch notes',
      content: 'We shipped the beta. Users liked the editor. Next is sync.',
    });

    expect(result).toContain('We shipped the beta.');
    expect(service.lastUsedOffline()).toBeTrue();
  });

  it('uses the offline fallback when the function is not configured', async () => {
    const response = new Response(JSON.stringify({ error: 'AI_NOT_CONFIGURED' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
    spyOn(window, 'fetch').and.resolveTo(response);

    const result = await service.generate({
      action: 'summarize',
      title: 'Launch notes',
      content: 'We shipped the beta. Users liked the editor. Next is sync.',
    });

    expect(result).toContain('We shipped the beta.');
    expect(service.lastUsedOffline()).toBeTrue();
  });

  it('sends the browser key to the AI function', async () => {
    service.setApiKey('test-key');
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify({ text: 'Generated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.generate({
      action: 'summarize',
      title: 'Launch notes',
      content: 'We shipped the beta.',
    });

    expect(result).toBe('Generated');
    expect(service.lastUsedOffline()).toBeFalse();
    const init = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-gemini-api-key']).toBe('test-key');
  });

  it('sends the Firebase ID token without leaking it into the request body', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify({ text: 'Generated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.generate({
      action: 'summarize',
      title: 'Launch notes',
      content: 'We shipped the beta.',
      authToken: 'firebase-id-token',
    });

    expect(result).toBe('Generated');
    const init = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer firebase-id-token',
    );
    expect(JSON.parse(String(init.body)).authToken).toBeUndefined();
  });

  it('uses the offline fallback when live AI access is denied', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'AI_AUTH_REQUIRED',
        message: 'Sign in to KeepNote or add your own Gemini key in AI settings.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
    spyOn(window, 'fetch').and.resolveTo(response);

    const result = await service.generate({
      action: 'summarize',
      title: 'Launch notes',
      content: 'We shipped the beta.',
    });

    expect(result).toContain('We shipped the beta.');
    expect(service.lastUsedOffline()).toBeTrue();
  });
});
