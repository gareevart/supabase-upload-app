import { normalizeLinkHref, type LinkOgSettings } from '@/shared/lib/blog/linkOg';

export interface PreviewLinkTarget {
  href: string;
  text: string;
}

export type PreviewLinkPart = { html: string } | { link: PreviewLinkTarget };

const MEDIA_IN_LINK = 'img, picture, video, iframe, svg';

function isIgnorableParagraphChild(node: ChildNode): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  }
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR';
}

/** A top-level paragraph whose only content is a single anchor. */
function isStandaloneLinkParagraph(anchor: Element): boolean {
  const paragraph = anchor.parentElement;
  if (!paragraph || paragraph.tagName !== 'P') return false;
  if (paragraph.parentElement !== paragraph.ownerDocument.body) return false;
  if (anchor.querySelector(MEDIA_IN_LINK)) return false;

  for (const child of paragraph.childNodes) {
    if (child === anchor) continue;
    if (isIgnorableParagraphChild(child)) continue;
    return false;
  }

  return true;
}

/**
 * Replace only standalone link paragraphs with preview placeholders.
 * Anchors that sit inside a sentence, list item, quote, or table stay in the HTML.
 * `data-og="off"` is read from the anchor itself, so two links may share a URL.
 */
export function splitLinksForPreview(html: string, settings: LinkOgSettings): PreviewLinkPart[] {
  if (!settings.enabled || typeof DOMParser === 'undefined') return [{ html }];

  const document = new DOMParser().parseFromString(html, 'text/html');
  const links: PreviewLinkTarget[] = [];

  document.querySelectorAll('a[href]').forEach((anchor) => {
    if (anchor.getAttribute('data-og') === 'off') return;
    if (!isStandaloneLinkParagraph(anchor)) return;

    const href = normalizeLinkHref(anchor.getAttribute('href') ?? '');
    if (!href) return;

    const index =
      links.push({
        href,
        text: anchor.textContent?.trim() || href,
      }) - 1;

    anchor.parentElement?.replaceWith(document.createComment(`blog-link-preview:${index}`));
  });

  if (!links.length) return [{ html }];

  return document.body.innerHTML.split(/<!--\s*blog-link-preview:(\d+)\s*-->/).map((part, index) =>
    index % 2 === 0 ? { html: part } : { link: links[Number(part)] },
  );
}
