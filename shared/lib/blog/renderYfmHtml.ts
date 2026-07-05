import transform from '@diplodoc/transform';

const NOTE_BLOCK_RE =
  /({% note (?:alert|info|tip|warning)(?:\s+"[^"]*")?\s+%})\s*\n([\s\S]*?)\s*\n({% endnote %})/g;

const CUT_BLOCK_RE =
  /({% cut(?:\s+"[^"]*")?\s+%})\s*\n([\s\S]*?)\s*\n({% endcut %})/g;

function normalizeYfmBlockDirectives(markdown: string): string {
  return markdown
    .replace(
      NOTE_BLOCK_RE,
      (_, open: string, body: string, close: string) =>
        `${open}\n\n${body.trim()}\n\n${close}`,
    )
    .replace(
      CUT_BLOCK_RE,
      (_, open: string, body: string, close: string) =>
        `${open}\n\n${body.trim()}\n\n${close}`,
    );
}

function addLazyLoading(html: string): string {
  return html.replace(/<img(?![^>]*\sloading=)/g, '<img loading="lazy" decoding="async"');
}

export function renderYfmHtml(content: string): string {
  const markdown = normalizeYfmBlockDirectives(content ?? '');

  if (!markdown.trim()) {
    return '';
  }

  const { result } = transform(markdown, {
    allowHTML: true,
    linkify: true,
    breaks: true,
    // Blog uses its own ToC; anchor links duplicate heading text without base YFM CSS.
    disableCommonAnchors: true,
  });

  return addLazyLoading(result.html);
}
