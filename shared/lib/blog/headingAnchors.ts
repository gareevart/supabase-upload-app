import { renderYfmHtml } from './renderYfmHtml';

export interface BlogHeading {
  id: string;
  level: number;
  text: string;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/** Read heading ids/text from YFM-rendered HTML — same ids the browser uses. */
export function extractHeadingsFromHtml(html: string): BlogHeading[] {
  if (!html.trim()) {
    return [];
  }

  const headings: BlogHeading[] = [];
  const headingTagRe = /<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

  for (const match of html.matchAll(headingTagRe)) {
    const level = Number(match[1]);
    const attrs = match[2] ?? '';
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);

    if (!idMatch) {
      continue;
    }

    const text = stripHtmlTags(match[3]);
    if (!text) {
      continue;
    }

    headings.push({ id: idMatch[1], level, text });
  }

  return headings;
}

export function prepareBlogHtml(content: string): { html: string; headings: BlogHeading[] } {
  const html = renderYfmHtml(content);
  return {
    html,
    headings: extractHeadingsFromHtml(html),
  };
}

export function extractHeadings(content: unknown): BlogHeading[] {
  const source = typeof content === 'string' ? content : '';
  if (!source.trim()) {
    return [];
  }

  return prepareBlogHtml(source).headings;
}
