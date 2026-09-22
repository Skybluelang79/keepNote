import { Injectable } from '@angular/core';

export type AiAction = 'summarize' | 'continue' | 'improve' | 'extract';

export interface AiRequest {
  action: AiAction;
  title: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  async generate(request: AiRequest): Promise<string> {
    let res: Response;
    try {
      res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      throw new Error('No connection to the AI service. Check your internet and try again.');
    }

    if (!res.ok) {
      let message = `AI request failed (${res.status})`;
      try {
        const data = (await res.json()) as { error?: string | { message?: string } };
        if (data.error === 'AI_NOT_CONFIGURED') {
          message = 'AI is not configured yet — add a GEMINI_API_KEY environment variable in Netlify.';
        } else if (typeof data.error === 'object' && data.error?.message) {
          message = data.error.message;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }

    const data = (await res.json()) as { text?: string };
    return data.text ?? '';
  }
}