export interface LinkOgSettings {
  enabled: boolean;
}

const LINK_OG_BLOCK_RE = /\n*<!--\s*link-og\s*\r?\n([\s\S]*?)\r?\n\s*-->\s*$/;

export function normalizeLinkHref(value: string): string | null {
  let href = value.trim();
  try {
    href = decodeURIComponent(href);
  } catch {
    // Keep the original value when a URL contains a malformed escape sequence.
  }

  const markdownLink = href.match(/^\[.*?\]\((https?:\/\/[^)\s]+)/i);
  if (markdownLink) href = markdownLink[1];
  if (href.startsWith('//')) href = `https:${href}`;
  if (href.startsWith('www.')) href = `https://${href}`;
  href = href.replace(/[.,;:!?]+$/, '');
  if (!/^https?:\/\//i.test(href)) return null;

  try {
    const url = new URL(href);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function parseLinkOg(content: string): { markdown: string; settings: LinkOgSettings } {
  const match = content.match(LINK_OG_BLOCK_RE);
  if (!match || match.index === undefined) {
    return { markdown: content, settings: { enabled: true } };
  }

  const enabled = !match[1].split(/\r?\n/).some((line) => line.trim() === 'enabled: off');
  return {
    markdown: content.slice(0, match.index).replace(/\s+$/, ''),
    settings: { enabled },
  };
}

export function stripLinkOgBlock(content: string): string {
  return parseLinkOg(content).markdown;
}

export function serializeLinkOg(markdown: string, settings: LinkOgSettings): string {
  const body = parseLinkOg(markdown).markdown.replace(/\s+$/, '');
  if (settings.enabled) return body;
  return `${body}\n\n<!-- link-og\nenabled: off\n-->`;
}
