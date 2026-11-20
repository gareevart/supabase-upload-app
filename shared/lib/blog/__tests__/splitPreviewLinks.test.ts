import { splitLinksForPreview } from '../splitPreviewLinks';

const CLOUDWATCH =
  'https://aws.amazon.com/about-aws/whats-new/2026/11/cloudwatch-network-path-monitoring/';

function htmlOf(parts: ReturnType<typeof splitLinksForPreview>): string {
  return parts.map((part) => ('html' in part ? part.html : '')).join('');
}

function linksOf(parts: ReturnType<typeof splitLinksForPreview>) {
  return parts.flatMap((part) => ('link' in part ? [part.link] : []));
}

describe('splitLinksForPreview', () => {
  it('keeps a link that continues a sentence inside its paragraph', () => {
    const html = `<p>Company: AWS<br>Published: November 18, 2026<br>Availability: Regional availability is listed in the linked documentation.<br>Primary source: <a href="${CLOUDWATCH}">CloudWatch network path monitoring</a></p>`;

    const parts = splitLinksForPreview(html, { enabled: true });

    expect(linksOf(parts)).toEqual([]);
    expect(parts).toEqual([{ html }]);
    expect(htmlOf(parts)).toContain('Primary source: <a');
    expect(htmlOf(parts)).toContain(CLOUDWATCH);
  });

  it('lifts a paragraph that contains only a link', () => {
    const html = '<p><a href="https://example.com/card">Standalone card</a></p>';

    const parts = splitLinksForPreview(html, { enabled: true });

    expect(linksOf(parts)).toEqual([
      { href: 'https://example.com/card', text: 'Standalone card' },
    ]);
    expect(htmlOf(parts)).not.toContain('<a');
    expect(htmlOf(parts)).not.toContain('<p');
  });

  it('lifts a standalone link surrounded by whitespace', () => {
    const html = '<p>\n<a href="https://example.com/card">Standalone card</a>\n</p>';

    expect(linksOf(splitLinksForPreview(html, { enabled: true }))).toEqual([
      { href: 'https://example.com/card', text: 'Standalone card' },
    ]);
  });

  it('does not lift a link that shares its paragraph with a line break and text', () => {
    const html = `<p>Primary source:<br><a href="${CLOUDWATCH}">CloudWatch network path monitoring</a></p>`;
    const parts = splitLinksForPreview(html, { enabled: true });

    expect(linksOf(parts)).toEqual([]);
    expect(parts).toEqual([{ html }]);
  });

  it('keeps list, quote, and punctuated links in the HTML', () => {
    const html = [
      '<ul><li>item with <a href="https://example.com/inline">inline</a> link</li>',
      '<li><a href="https://example.com/only">only link</a></li></ul>',
      '<blockquote><p><a href="https://example.com/quote">quote</a></p></blockquote>',
      '<p><a href="https://example.com/docs">docs</a>.</p>',
    ].join('');

    const parts = splitLinksForPreview(html, { enabled: true });

    expect(linksOf(parts)).toEqual([]);
    expect(parts).toEqual([{ html }]);
  });

  it('leaves every anchor in place when the post switch is off', () => {
    const html = '<p><a href="https://example.com/card">Standalone card</a></p>';

    expect(splitLinksForPreview(html, { enabled: false })).toEqual([{ html }]);
  });

  it('leaves a standalone link in place when that anchor opts out', () => {
    const html = '<p><a href="https://example.com/card" data-og="off">Standalone card</a></p>';

    expect(splitLinksForPreview(html, { enabled: true })).toEqual([{ html }]);
  });

  it('does not treat a shared URL as off for every anchor', () => {
    const html = [
      '<p>See <a href="https://example.com/docs" data-og="off">docs</a> in the sentence.</p>',
      '<p><a href="https://example.com/docs" data-og="off">same url, still off</a></p>',
      '<p><a href="https://example.com/docs">same url, preview</a></p>',
    ].join('');

    const parts = splitLinksForPreview(html, { enabled: true });

    expect(linksOf(parts)).toEqual([
      { href: 'https://example.com/docs', text: 'same url, preview' },
    ]);
    expect(htmlOf(parts)).toContain('data-og="off"');
    expect(htmlOf(parts)).toContain('See <a href="https://example.com/docs" data-og="off">docs</a>');
    expect(htmlOf(parts)).not.toContain('same url, preview');
  });

  it('does not lift image links or non-http hrefs', () => {
    const html = [
      '<p><a href="https://example.com/pic"><img src="https://example.com/a.png" alt="pic"></a></p>',
      '<p><a href="/blog/og-test-post">local</a></p>',
    ].join('');

    expect(splitLinksForPreview(html, { enabled: true })).toEqual([{ html }]);
  });
});
