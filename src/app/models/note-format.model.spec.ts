import { applyBlockFormat, applyInlineFormat } from './note-format.model';

describe('note formatting', () => {
  it('wraps a selection with inline markers', () => {
    const result = applyInlineFormat('hello world', 6, 11, 'bold');
    expect(result.text).toBe('hello **world**');
    expect(result.start).toBe(8);
    expect(result.end).toBe(13);
  });

  it('unwraps already formatted text', () => {
    const result = applyInlineFormat('hello **world**', 6, 15, 'bold');
    expect(result.text).toBe('hello world');
    expect(result.start).toBe(6);
    expect(result.end).toBe(11);
  });

  it('prefixes the selected line for block formats', () => {
    const result = applyBlockFormat('first\nsecond', 7, 13, 'bullet');
    expect(result.text).toBe('first\n- second');
  });

  it('increments numbered list prefixes across lines', () => {
    const result = applyBlockFormat('one\ntwo', 0, 7, 'numbered');
    expect(result.text).toBe('1. one\n2. two');
  });
});
