/**
 * Converts editor content (Markdown or legacy TipTap JSON) to HTML.
 * Used for email preview in broadcast forms.
 */
import { isTipTapContent, convertTipTapToHtml, normalizeTipTapContent } from '@/lib/tiptapConverter';

let _md: any = null;
function getMarkdownIt(): any {
  if (!_md) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const MarkdownIt = require('markdown-it');
    _md = new MarkdownIt({ html: true, breaks: true, linkify: true });
  }
  return _md;
}

export function tiptapToHtml(content: string): string {
  if (!content) return '';
  if (isTipTapContent(content)) {
    return convertTipTapToHtml(normalizeTipTapContent(content));
  }
  return getMarkdownIt().render(content);
}

export function renderEmailPreview(html: string, subject?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject ?? ''}</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
  h1, h2, h3 { color: #222; }
  a { color: #0070f3; }
  img { max-width: 100%; height: auto; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
  pre { background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
</style>
</head>
<body>${html}</body>
</html>`;
}
