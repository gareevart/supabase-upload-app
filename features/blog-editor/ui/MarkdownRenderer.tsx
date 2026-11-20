'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { LinkPreview } from '@/features/blog-editor/ui/LinkPreview';
import { YfmCodeBlock } from '@/features/blog-editor/ui/YfmCodeBlock';
import { prepareBlogHtml } from '@/shared/lib/blog/headingAnchors';
import { parseLinkOg, type LinkOgSettings } from '@/shared/lib/blog/linkOg';
import { splitLinksForPreview } from '@/shared/lib/blog/splitPreviewLinks';
import { splitYfmHtml } from '@/shared/lib/blog/splitYfmHtml';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function HtmlChunk({ html, settings }: { html: string; settings: LinkOgSettings }) {
  const parts = React.useMemo(() => splitLinksForPreview(html, settings), [html, settings]);
  return (
    <>
      {parts.map((part, index) => {
        if ('link' in part) {
          return (
            <div key={`preview-${index}`} className="markdown-renderer__preview">
              <LinkPreview href={part.link.href}>{part.link.text}</LinkPreview>
            </div>
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
