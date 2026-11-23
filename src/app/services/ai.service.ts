import { Injectable, computed, signal } from '@angular/core';

export type AiAction =
  | 'summarize'
  | 'continue'
  | 'improve'
  | 'extract'
  | 'title'
  | 'fix'
  | 'shorten'
  | 'tags'
  | 'organize'
  | 'brainstorm'
  | 'custom';

export interface AiRequest {
  action: AiAction;
  title: string;
  content: string;
  labels?: string[];
  instruction?: string;
  authToken?: string;
}

export interface AiOrganizeResult {
  title: string;
  labels: string[];
  summary: string;
  tasks: string[];
}

const API_KEY_STORAGE = 'keepnote.ai.key.v1';

@Injectable({ providedIn: 'root' })
export class AiService {
  readonly apiKey = signal<string>(readStoredKey());
  readonly hasApiKey = computed(() => this.apiKey().trim().length > 0);
  readonly settingsOpen = signal(false);
  readonly lastUsedOffline = signal(false);

  setApiKey(value: string): void {
    const key = value.trim();
    this.apiKey.set(key);
    try {
      if (key) localStorage.setItem(API_KEY_STORAGE, key);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      return;
    }
  }

  clearApiKey(): void {
    this.setApiKey('');
  }

  async generate(request: AiRequest): Promise<string> {
    this.lastUsedOffline.set(false);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = this.apiKey().trim();
    const authToken = request.authToken?.trim();
    if (key) headers['x-gemini-api-key'] = key;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const body = { ...request };
    delete body.authToken;
    let res: Response;
    try {
      res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch {
      return this.fallback(request);
    }

    if (!res.ok) {
      const message = await this.readError(res);
      if (
        res.status === 401 ||
        res.status === 404 ||
        message === 'AI_NOT_CONFIGURED' ||
        message === 'AI_AUTH_REQUIRED' ||
        message === 'AI_AUTH_NOT_CONFIGURED'
      ) {
        return this.fallback(request);
      }
      throw new Error(message);
    }

    try {
      const data = (await res.json()) as { text?: string };
      return data.text ?? this.fallback(request);
    } catch {
      return this.fallback(request);
    }
  }

  private async readError(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { error?: string | { message?: string } };
      if (data.error === 'AI_NOT_CONFIGURED') return data.error;
      if (typeof data.error === 'string') return data.error;
      if (data.error?.message) return data.error.message;
    } catch {
      return `AI request failed (${res.status})`;
    }
    return `AI request failed (${res.status})`;
  }

  private fallback(request: AiRequest): string {
    this.lastUsedOffline.set(true);
    const title = request.title.trim();
    const content = request.content.trim();
    const source = content || title;
    if (!source) return '';
    const lines = this.sentences(source);

    switch (request.action) {
      case 'summarize':
        return lines
          .slice(0, 5)
          .map((line) => (line.startsWith('-') ? line : `- ${line}`))
          .join('\n');
      case 'continue':
        return [
          'Next steps:',
          '- [ ] Review the key points above',
          '- [ ] Decide the single most important next action',
          '- [ ] Add a reminder if this is time-sensitive',
        ].join('\n');
      case 'improve':
        return lines.map((line) => line.replace(/\s+/g, ' ').trim()).join('\n');
      case 'extract':
        return this.actionLines(source).map((line) => `- [ ] ${line}`).join('\n');
      case 'title':
        return this.firstWords(lines[0] || title, 8).replace(/[.!?]+$/, '');
      case 'fix': {
        const fixed = source
          .replace(/[ \t]{2,}/g, ' ')
          .replace(/\s+([,.!?])/g, '$1')
          .trim();
        return fixed.charAt(0).toUpperCase() + fixed.slice(1);
      }
      case 'shorten':
        return lines.slice(0, 2).join('\n');
      case 'tags':
        return this.inferLabels(source, request.labels ?? []).join(', ');
      case 'organize': {
        const summaryLines = lines.filter((line) => !/^([-*]|\d+\.)\s/.test(line));
        const summary = (summaryLines[0] || lines[0] || title).slice(0, 220);
        const result: AiOrganizeResult = {
          title: title || this.firstWords(summary, 8),
          labels: this.inferLabels(source, request.labels ?? []),
          summary,
          tasks: this.actionLines(source).slice(0, 6),
        };
        return JSON.stringify(result, null, 2);
      }
      case 'brainstorm': {
        const subject = title || this.firstWords(source, 6);
        return [
          `Ideas for “${subject}”:`,
          '- Start with the smallest useful version',
          '- Collect three examples worth copying',
          '- Break the idea into one-week milestones',
          '- Ask one person for a blunt critique',
          '- Turn the best idea into a checklist',
        ].join('\n');
      }
      case 'custom': {
        const instruction =
          (request.instruction ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'polish this note';
        return `Offline draft · ${instruction}\n\n${lines.slice(0, 5).join('\n')}`;
      }
    }
  }

  private sentences(text: string): string[] {
    return text
      .replace(/\r/g, '')
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private actionLines(text: string): string[] {
    return this.sentences(text)
      .filter(
        (line) =>
          /^([-*]|\d+\.)\s/.test(line) ||
          /\b(should|need to|follow up|todo|call|email|review|finish|send|book|pay|check)\b/i.test(line),
      )
      .map((line) =>
        line.replace(/^([-*]|\d+\.)\s+/, '').replace(/^\[[ xX]\]\s*/, '').trim(),
      )
      .filter(Boolean);
  }

  private firstWords(text: string, max: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.slice(0, max).join(' ');
  }

  private inferLabels(source: string, available: string[]): string[] {
    const labels = available.length ? available : ['Work', 'Personal', 'Ideas'];
    const rules: Array<[RegExp, string]> = [
      [/\b(meeting|agenda|standup|decision|action item|client|deadline|report|roadmap)\b/i, 'Work'],
      [/\b(grocery|shopping|buy|recipe|home|family|rent|bill)\b/i, 'Personal'],
      [/\b(idea|brainstorm|concept|research|learn|read|book|study)\b/i, 'Ideas'],
    ];
    const found = rules
      .filter(([pattern]) => pattern.test(source))
      .map(([, name]) => labels.find((label) => label.toLowerCase() === name.toLowerCase()) ?? name)
      .filter((name, index, all) => all.indexOf(name) === index);
    return (found.length ? found : [labels[0]]).slice(0, 3);
  }
}

function readStoredKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}
