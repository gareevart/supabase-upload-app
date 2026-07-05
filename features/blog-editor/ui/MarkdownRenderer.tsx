'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { YfmCodeBlock } from '@/features/blog-editor/ui/YfmCodeBlock';
import { renderYfmHtml } from '@/shared/lib/blog/renderYfmHtml';
import { splitYfmHtml } from '@/shared/lib/blog/splitYfmHtml';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { t } = useI18n();
  const segments = useMemo(
    () => splitYfmHtml(renderYfmHtml(content)),
    [content],
  );
  const copyLabel = t('markdownRenderer.copyCode');
  const copiedLabel = t('markdownRenderer.copiedCode');

  return (
    <div className={`markdown-renderer yfm ${className ?? ''}`.trim()}>
      {segments.map((segment, index) =>
        segment.type === 'html' ? (
          <div
            key={`html-${index}`}
            className="markdown-renderer__html-chunk"
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
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
