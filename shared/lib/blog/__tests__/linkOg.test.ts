import { parseLinkOg, serializeLinkOg } from '../linkOg';

describe('linkOg', () => {
  it('keeps the post unchanged while OG previews are enabled', () => {
    const markdown = 'Read [docs](https://example.com/docs){data-og=off}.';
    expect(serializeLinkOg(markdown, { enabled: true })).toBe(markdown);
    expect(parseLinkOg(markdown).settings.enabled).toBe(true);
  });

  it('stores one post-wide switch without touching the link markup', () => {
    const markdown = 'See [docs](https://example.com/docs){data-og=off}.';
    const stored = serializeLinkOg(markdown, { enabled: false });
    const parsed = parseLinkOg(stored);

    expect(parsed.markdown).toBe(markdown);
    expect(parsed.settings.enabled).toBe(false);
    expect(serializeLinkOg(parsed.markdown, { enabled: true })).toBe(markdown);
  });
});
