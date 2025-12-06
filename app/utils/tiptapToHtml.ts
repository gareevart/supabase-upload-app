import { generateHTML } from '@tiptap/html';
import { StarterKit } from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Typography } from '@tiptap/extension-typography';
import { ResizableImage } from '@/app/components/blog/editor/resizableImageOnly';

// Server-safe extensions (without DOM-dependent extensions like DragHandleExtension)
const serverSafeExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
  }),
  Color,
  TextStyle,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      rel: 'noopener noreferrer',
      class: 'text-blue-600 hover:underline',
    },
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'rounded-lg',
    },
  }),
  ResizableImage.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'rounded-lg',
    },
  }),
  Highlight,
  Underline,
  Subscript,
  Superscript,
  Typography,
];

// Helper function to safely generate HTML from TipTap JSON
function safeGenerateHTML(content: any): string {
  try {
    // Validate content structure
    if (!content || typeof content !== 'object') {
      return '<p>Invalid content</p>';
    }

    // Check if it's a valid TipTap document structure
    if (content.type === 'doc' || content.content) {
      try {
        // Ensure extensions is an array and generateHTML receives correct types
        const html = generateHTML(content, serverSafeExtensions as any);
        return html || '<p>Empty content</p>';
      } catch (generateError: any) {
        console.error('Error generating HTML from TipTap content:', generateError);
        // Log more details about the error
        if (generateError?.message) {
          console.error('Error message:', generateError.message);
        }
        if (generateError?.stack) {
          console.error('Error stack:', generateError.stack);
        }
        // Fallback: try with a minimal document structure
        if (content.content && Array.isArray(content.content)) {
          return '<p>Content rendered with errors</p>';
        }
        throw generateError;
      }
    }

    return '<p>Invalid TipTap document structure</p>';
  } catch (error: any) {
    console.error('Error in safeGenerateHTML:', error);
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    return '<p>Error rendering content</p>';
  }
}

export function tiptapToHtml(jsonContent: any): string {
  try {
    // If content is already a string, check if it's JSON
    if (typeof jsonContent === 'string') {
      // Check if it's already HTML
      if (jsonContent.trim().startsWith('<') && jsonContent.trim().endsWith('>')) {
        return jsonContent;
      }

      // Check if it's a stringified JSON
      if (jsonContent.trim().startsWith('{') && jsonContent.trim().endsWith('}')) {
        try {
          const parsedContent = JSON.parse(jsonContent);
          if (parsedContent && (parsedContent.type === 'doc' || parsedContent.content)) {
            return safeGenerateHTML(parsedContent);
          }
        } catch (parseError) {
          console.error('Error parsing JSON string:', parseError);
          // If it's not valid JSON, treat it as plain text
          return jsonContent;
        }
      }

      // Otherwise, it's plain text
      return jsonContent;
    }

    // Handle null or undefined
    if (!jsonContent) return '';

    // Handle JSON content
    if (typeof jsonContent === 'object') {
      // If it's a proper TipTap JSON structure with content
      if (jsonContent.type === 'doc' || jsonContent.content) {
        return safeGenerateHTML(jsonContent);
      }

      // Try to stringify and parse if it's some other object
      try {
        const contentStr = JSON.stringify(jsonContent);
        // Don't return the stringified JSON directly
        // Instead, try to convert it to HTML if possible
        try {
          const parsedContent = JSON.parse(contentStr);
          if (parsedContent && (parsedContent.type === 'doc' || parsedContent.content)) {
            return safeGenerateHTML(parsedContent);
          }
        } catch (parseError) {
          console.error('Error parsing JSON content:', parseError);
        }

        // If we can't convert it to HTML, return a placeholder
        return '<p>Unable to render content</p>';
      } catch (stringifyError) {
        console.error('Error stringifying content:', stringifyError);
      }
    }

    // Fallback
    console.warn('Unable to properly convert content to HTML, using fallback method');
    return '<p>Unable to render content</p>';
  } catch (error) {
    console.error('Error converting TipTap JSON to HTML:', error);
    return '<p>Error rendering content</p>';
  }
}

export function renderEmailPreview(html: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          h1, h2, h3 { color: #333; }
          p { margin-bottom: 1em; }
          a { color: #0066cc; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}