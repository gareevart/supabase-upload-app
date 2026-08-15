'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { LinkPreview } from '@/features/blog-editor/ui/LinkPreview';
import { YfmCodeBlock } from '@/features/blog-editor/ui/YfmCodeBlock';
import { prepareBlogHtml } from '@/shared/lib/blog/headingAnchors';
import { splitYfmHtml } from '@/shared/lib/blog/splitYfmHtml';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface LinkTarget {
  href: string;
  text: string;
}

function normalizeExternalHref(value: string): string | null {
  let href = value.trim();
  try {
    href = decodeURIComponent(href);
  } catch {
    // Keep the original value when a URL contains a malformed escape sequence.
  }

  const markdownLink = href.match(/^\[.*?\]\((https?:\/\/[^)]+)\)$/i);
  if (markdownLink) href = markdownLink[1];
  if (href.startsWith('//')) href = `https:${href}`;
  if (href.startsWith('www.')) href = `https://${href}`;
  return /^https?:\/\//i.test(href) ? href : null;
}

function splitLinksForPreview(html: string): Array<{ html: string } | { link: LinkTarget }> {
  if (typeof DOMParser === 'undefined') return [{ html }];

  const document = new DOMParser().parseFromString(html, 'text/html');
  const links: LinkTarget[] = [];
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = normalizeExternalHref(anchor.getAttribute('href') ?? '');
    if (!href) return;
    const index = links.push({ href, text: anchor.textContent?.trim() || href }) - 1;
    anchor.replaceWith(document.createComment(`blog-link-preview:${index}`));
  });

  const serialized = document.body.innerHTML;
  if (!links.length) return [{ html }];

  return serialized.split(/<!--\s*blog-link-preview:(\d+)\s*-->/).map((part, index) =>
    index % 2 === 0 ? { html: part } : { link: links[Number(part)] },
  );
}

function HtmlChunk({ html }: { html: string }) {
  const parts = React.useMemo(() => splitLinksForPreview(html), [html]);
  return (
    <>
      {parts.map((part, index) =>
        'link' in part ? (
          <LinkPreview key={`preview-${index}`} href={part.link.href}>
            {part.link.text}
          </LinkPreview>
        ) : part.html ? (
          <span key={`html-${index}`} dangerouslySetInnerHTML={{ __html: part.html }} />
        ) : null,
      )}
    </>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { t } = useI18n();
  const segments = useMemo(() => {
    const { html } = prepareBlogHtml(content);
    return splitYfmHtml(html);
  }, [content]);
  const copyLabel = t('markdownRenderer.copyCode');
  const copiedLabel = t('markdownRenderer.copiedCode');

  return (
    <div className={`markdown-renderer yfm ${className ?? ''}`.trim()}>
      {segments.map((segment, index) =>
        segment.type === 'html' ? (
          <div key={`html-${index}`} className="markdown-renderer__html-chunk">
            <HtmlChunk html={segment.content} />
          </div>
        ) : (
          <YfmCodeBlock
            key={`code-${index}`}
            codeClassName={segment.codeClassName}
            highlightedHtml={segment.highlightedHtml}
            text={segment.text}
            copyLabel={copyLabel}
            copiedLabel={copiedLabel}
          />
        ),
      )}
    </div>
  );
};
