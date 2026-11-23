import { renderRichText } from './rich-text.pipe';

describe('renderRichText', () => {
  it('renders inline formatting', () => {
    const html = renderRichText('**bold** and *italic* with `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('renders headings, quotes and lists', () => {
    const html = renderRichText('# Plan\n> Focus\n- one\n- two');
    expect(html).toContain('<h3>Plan</h3>');
    expect(html).toContain('<blockquote>Focus</blockquote>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
  });

  it('escapes html before formatting', () => {
    const html = renderRichText('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('does not treat checklist items as bullet lists', () => {
    const html = renderRichText('- [ ] task');
    expect(html).not.toContain('<ul>');
    expect(html).toContain('[ ] task');
  });
});
