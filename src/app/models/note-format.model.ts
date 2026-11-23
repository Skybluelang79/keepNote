export type InlineFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'highlight'
  | 'link';

export type BlockFormat = 'heading' | 'quote' | 'bullet' | 'numbered' | 'divider';

export interface FormatResult {
  text: string;
  start: number;
  end: number;
}

const INLINE_WRAPPERS: Record<Exclude<InlineFormat, 'link'>, [string, string, string]> = {
  bold: ['**', '**', 'bold text'],
  italic: ['*', '*', 'italic text'],
  underline: ['++', '++', 'underlined text'],
  strike: ['~~', '~~', 'struck text'],
  code: ['`', '`', 'code'],
  highlight: ['==', '==', 'highlighted text'],
};

export function applyInlineFormat(
  value: string,
  start: number,
  end: number,
  format: InlineFormat,
): FormatResult {
  const selected = value.slice(start, end);

  if (format === 'link') {
    const label = selected || 'link text';
    const token = `[${label}](https://)`;
    return {
      text: value.slice(0, start) + token + value.slice(end),
      start: start + 1,
      end: start + 1 + label.length,
    };
  }

  const [before, after, placeholder] = INLINE_WRAPPERS[format];
  if (selected.startsWith(before) && selected.endsWith(after) && selected.length > before.length + after.length) {
    const inner = selected.slice(before.length, -after.length);
    return {
      text: value.slice(0, start) + inner + value.slice(end),
      start,
      end: start + inner.length,
    };
  }

  const inner = selected || placeholder;
  const token = before + inner + after;
  return {
    text: value.slice(0, start) + token + value.slice(end),
    start: start + before.length,
    end: start + before.length + inner.length,
  };
}

export function applyBlockFormat(
  value: string,
  start: number,
  end: number,
  format: BlockFormat,
): FormatResult {
  if (format === 'divider') {
    const token = '\n---\n';
    return {
      text: value.slice(0, start) + token + value.slice(end),
      start: start + token.length,
      end: start + token.length,
    };
  }

  const lineStart = start > 0 ? value.lastIndexOf('\n', start - 1) + 1 : 0;
  const nextBreak = value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd) || 'Text';

  let number = 1;
  const transformed = block
    .split('\n')
    .map((line) => {
      const body = line.replace(/^(?:#{1,3}\s+|>\s?|[-*]\s+|\d+\.\s+)/, '') || 'Text';
      if (format === 'heading') return `# ${body}`;
      if (format === 'quote') return `> ${body}`;
      if (format === 'bullet') return `- ${body}`;
      return `${number++}. ${body}`;
    })
    .join('\n');

  return {
    text: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + transformed.length,
  };
}
