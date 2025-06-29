"use client";

import React, { useEffect, useRef } from 'react';
import { renderContent, isTipTapContent } from '@/lib/tiptapConverter';

interface TipTapContentProps {
  content: any;
  className?: string;
}

/**
 * Component to render TipTap content
 * Handles both TipTap JSON and legacy content blocks
 */
const TipTapContent: React.FC<TipTapContentProps> = ({ content, className = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    
    // Render content based on its format
    let htmlContent = '';
    
    if (typeof content === 'string') {
      // Check if it's TipTap JSON
      if (isTipTapContent(content)) {
        htmlContent = renderContent(content);
      } else {
        // Plain text or HTML
        htmlContent = content;
      }
    } else if (Array.isArray(content)) {
      // Legacy content blocks
      htmlContent = renderContent(content);
    } else if (typeof content === 'object' && content !== null) {
      // Might be a TipTap JSON object
      try {
        htmlContent = renderContent(JSON.stringify(content));
      } catch (error) {
        console.error('Error rendering content object:', error);
        htmlContent = '<p>Error rendering content</p>';
      }
    } else {
      // Fallback
      htmlContent = '<p>No content available</p>';
    }
    
    // Set the HTML content
    contentRef.current.innerHTML = htmlContent;
    
    // Apply syntax highlighting to code blocks if Prism is available
    if (typeof window !== 'undefined' && (window as any).Prism) {
      (window as any).Prism.highlightAllUnder(contentRef.current);
    }
    
    // Add click handler for links to open in new tab
    const links = contentRef.current.querySelectorAll('a');
    links.forEach(link => {
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }, [content]);

  return (
    <>
      <div
        ref={contentRef}
        className={`tiptap-content prose prose-lg max-w-none ${className}`}
      />
      
      {/* Add global styles for the content */}
      <style jsx global>{`
        .tiptap-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
          display: block;
        }
        
        .tiptap-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .tiptap-content a:hover {
          text-decoration: none;
        }
      `}</style>
    </>
  );
};

export default TipTapContent;