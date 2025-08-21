"use client";

import React from 'react';
import { isTipTapContent, convertBlocksToTipTap } from '@/lib/tiptapConverter';
import TipTapRenderer from './TipTapRenderer';

interface TipTapContentProps {
  content: any;
  className?: string;
}

/**
 * Component to render TipTap content
 * Handles both TipTap JSON and legacy content blocks
 */
const TipTapContent: React.FC<TipTapContentProps> = ({ content, className = '' }) => {
  // Normalize content to TipTap JSON format
  let tiptapContent = '';
  
  if (typeof content === 'string') {
    // Check if it's TipTap JSON
    if (isTipTapContent(content)) {
      tiptapContent = content;
    } else {
      // Plain text - convert to TipTap format
      tiptapContent = JSON.stringify({
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: content }]
        }]
      });
    }
  } else if (Array.isArray(content)) {
    // Legacy content blocks - convert to TipTap
    tiptapContent = convertBlocksToTipTap(content);
  } else if (typeof content === 'object' && content !== null) {
    // Might be a TipTap JSON object
    try {
      if (content.type === 'doc' && Array.isArray(content.content)) {
        tiptapContent = JSON.stringify(content);
      } else {
        // Unknown object format
        tiptapContent = JSON.stringify({
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Error rendering content" }]
          }]
        });
      }
    } catch (error) {
      console.error('Error processing content object:', error);
      tiptapContent = JSON.stringify({
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Error rendering content" }]
        }]
      });
    }
  } else {
    // Fallback
    tiptapContent = JSON.stringify({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "No content available" }]
      }]
    });
  }

  return (
    <>
      <div className={`tiptap-content mt-4 prose prose-lg max-w-none ${className}`}>
        <TipTapRenderer content={tiptapContent} />
      </div>
      
      {/* Add global styles for the content */}
      <style jsx global>{`
        .tiptap-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          display: block;
          border: 1px solid var(--g-color-line-generic); 
        }
        
        .tiptap-content a {
          color: var(--g-color-text-link);
          text-decoration: none;
          font-size: 1rem;
        }
        
        .tiptap-content a:hover {
          text-decoration: underline;
        }

        /* Image Generator Display Styles */
        .image-generator-display {
          margin: 2rem 0;
          border: 2px solid var(--g-color-line-generic);
          border-radius: 12px;
          background: var(--g-color-base-float);
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .image-generator-content {
          display: flex;
          flex-direction: column;
        }

        .generated-image-container {
          position: relative;
          background: var(--g-color-base-background);
          padding: 16px;
        }

        .prompt-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--g-color-text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .prompt-text {
          font-size: 1rem;
          color: var(--g-color-text-primary);
          line-height: 1.5;
          margin-bottom: 16px;
          padding: 12px;
          background: var(--g-color-base-background);
          border-radius: 6px;
          border-left: 4px solid var(--g-color-base-brand);
          font-style: italic;
        }

        .try-prompt-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .try-prompt-btn:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .try-prompt-btn:active {
          transform: translateY(0);
        }

        .btn-icon {
          font-size: 1rem;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .image-generator-display {
            margin: 1.5rem 0;
          }
          
          .prompt-display {
            padding: 16px;
          }
          
          .generated-image-container {
            padding: 12px;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .image-generator-display {
            border-color: var(--g-color-line-generic);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
        }
      `}</style>
    </>
  );
};

export default TipTapContent;
