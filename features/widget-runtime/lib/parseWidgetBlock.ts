import { sanitizePermissions, WidgetManifest } from '@/shared/types/widget';

export interface ParsedWidgetBlock {
  html: string;
  manifest: WidgetManifest;
}

export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'widget'; widget: ParsedWidgetBlock };

// Models do not always label the fence as ```widget — they often emit
// ```html or a bare ``` instead. Any fenced block is treated as a widget if
// it is explicitly labelled "widget" OR contains a widget-manifest comment.
const FENCED_BLOCK_REGEX = /```([a-zA-Z]*)[ \t]*\n([\s\S]*?)```/g;
const MANIFEST_COMMENT_REGEX = /<!--\s*widget-manifest\s*({[\s\S]*?})\s*-->/;

const isWidgetFence = (language: string, body: string): boolean =>
  language.toLowerCase() === 'widget' || MANIFEST_COMMENT_REGEX.test(body);

export const parseWidgetManifest = (html: string): WidgetManifest => {
  const fallback: WidgetManifest = { title: 'Widget', permissions: [] };
  const match = html.match(MANIFEST_COMMENT_REGEX);
  if (!match) return fallback;

  try {
    const raw = JSON.parse(match[1]);
    return {
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallback.title,
      description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
      permissions: sanitizePermissions(raw.permissions),
    };
  } catch {
    return fallback;
  }
};

// Splits an assistant message into markdown text and ```widget blocks
export const parseMessageSegments = (content: string): MessageSegment[] => {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(FENCED_BLOCK_REGEX)) {
    const html = match[2].trim();
    if (!isWidgetFence(match[1], html) || !html) {
      continue;
    }

    const index = match.index ?? 0;
    const text = content.slice(lastIndex, index).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }

    segments.push({
      type: 'widget',
      widget: { html, manifest: parseWidgetManifest(html) },
    });

    lastIndex = index + match[0].length;
  }

  const tail = content.slice(lastIndex).trim();
  if (tail) {
    segments.push({ type: 'text', content: tail });
  }

  return segments;
};

export const hasWidgetBlock = (content: string): boolean =>
  parseMessageSegments(content).some((segment) => segment.type === 'widget');
