export type YfmHtmlSegment =
  | { type: 'html'; content: string }
  | { type: 'code'; codeClassName: string; highlightedHtml: string; text: string };

const YFM_CLIPBOARD_RE =
  /<div class="yfm-clipboard">\s*<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/div>/g;

function highlightedHtmlToText(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent ?? '';
}

export function splitYfmHtml(html: string): YfmHtmlSegment[] {
  if (!html.trim()) {
    return [];
  }

  const segments: YfmHtmlSegment[] = [];
  let lastIndex = 0;

  for (const match of html.matchAll(YFM_CLIPBOARD_RE)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({ type: 'html', content: html.slice(lastIndex, index) });
    }

    const classMatch = match[1].match(/class="([^"]*)"/);
    const highlightedHtml = match[2];

    segments.push({
      type: 'code',
      codeClassName: classMatch?.[1] ?? '',
      highlightedHtml,
      text: highlightedHtmlToText(highlightedHtml),
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'html', content: html }];
}
