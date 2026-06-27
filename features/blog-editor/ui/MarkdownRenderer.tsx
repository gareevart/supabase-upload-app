import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const markdown = content ?? '';

  return (
    <div className={`markdown-renderer ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Lazy-load inline content images so long posts don't block paint
          // and off-screen images aren't fetched until needed.
          img: ({ node, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img {...props} loading="lazy" decoding="async" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
