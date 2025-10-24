import { generateHTML } from '@tiptap/html';
import { extensions } from '@/app/components/blog/editor/serverExtensions';

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
            return generateHTML(parsedContent, extensions);
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
        return generateHTML(jsonContent, extensions);
      }

      // Try to stringify and parse if it's some other object
      try {
        const contentStr = JSON.stringify(jsonContent);
        // Don't return the stringified JSON directly
        // Instead, try to convert it to HTML if possible
        try {
          const parsedContent = JSON.parse(contentStr);
          if (parsedContent && (parsedContent.type === 'doc' || parsedContent.content)) {
            return generateHTML(parsedContent, extensions);
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