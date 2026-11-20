'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { LinkPreview } from '@/features/blog-editor/ui/LinkPreview';
import { YfmCodeBlock } from '@/features/blog-editor/ui/YfmCodeBlock';
import { prepareBlogHtml } from '@/shared/lib/blog/headingAnchors';
import { normalizeLinkHref, parseLinkOg, type LinkOgSettings } from '@/shared/lib/blog/linkOg';
import { splitYfmHtml } from '@/shared/lib/blog/splitYfmHtml';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface LinkTarget {
  href: string;
  text: string;
  og: boolean;
}

function splitLinksForPreview(html: string): Array<{ html: string } | { link: LinkTarget }> {
  if (typeof DOMParser === 'undefined') return [{ html }];

  const document = new DOMParser().parseFromString(html, 'text/html');
  const links: LinkTarget[] = [];
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = normalizeLinkHref(anchor.getAttribute('href') ?? '');
    if (!href) return;
    const index = links.push({
      href,
      text: anchor.textContent?.trim() || href,
      og: anchor.getAttribute('data-og') !== 'off',
    }) - 1;
    anchor.replaceWith(document.createComment(`blog-link-preview:${index}`));
  });

  const serialized = document.body.innerHTML;
  if (!links.length) return [{ html }];

  return serialized.split(/<!--\s*blog-link-preview:(\d+)\s*-->/).map((part, index) =>
    index % 2 === 0 ? { html: part } : { link: links[Number(part)] },
  );
}

function HtmlChunk({ html, settings }: { html: string; settings: LinkOgSettings }) {
  const parts = React.useMemo(() => splitLinksForPreview(html), [html]);
  return (
    <>
      {parts.map((part, index) => {
        if ('link' in part) {
          if (!settings.enabled || !part.link.og) {
            return (
              <a key={`link-${index}`} href={part.link.href} target="_blank" rel="noreferrer">
                {part.link.text}
              </a>
            );
          }
          return (
            <LinkPreview key={`preview-${index}`} href={part.link.href}>
              {part.link.text}
            </LinkPreview>
          );
        }
        return part.html ? (
          <span key={`html-${index}`} dangerouslySetInnerHTML={{ __html: part.html }} />
        ) : null;
      })}
    </>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { t } = useI18n();
  const parsed = useMemo(() => parseLinkOg(content), [content]);
  const segments = useMemo(() => {
    const { html } = prepareBlogHtml(parsed.markdown);
    return splitYfmHtml(html);
  }, [parsed.markdown]);
  const copyLabel = t('markdownRenderer.copyCode');
  const copiedLabel = t('markdownRenderer.copiedCode');

  return (
    <div className={`markdown-renderer yfm ${className ?? ''}`.trim()}>
      {segments.map((segment, index) =>
        segment.type === 'html' ? (
          <div key={`html-${index}`} className="markdown-renderer__html-chunk">
            <HtmlChunk html={segment.content} settings={parsed.settings} />
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
