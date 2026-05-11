import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { isTipTapContent, normalizeTipTapContent } from '@/lib/tiptapConverter';
import { convertTipTapToMarkdown } from '@/lib/tiptapToMarkdown';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function resolveContent(raw: string): string {
  if (!raw) return '';
  if (isTipTapContent(raw)) {
    return convertTipTapToMarkdown(normalizeTipTapContent(raw));
  }
  return raw;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const markdown = resolveContent(content);

  return (
    <div className={`markdown-renderer ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
