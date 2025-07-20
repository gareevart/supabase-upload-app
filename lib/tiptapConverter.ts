import { EditorContent } from "@/app/components/blog/editor/types";

/**
 * Converts legacy content blocks to TipTap JSON format
 * @param contentBlocks Array of legacy content blocks
 * @returns TipTap JSON content as string
 */
export function convertBlocksToTipTap(contentBlocks: EditorContent[]): string {
  // Create a basic TipTap document structure
  const tipTapDoc: {
    type: string;
    content: any[];
  } = {
    type: "doc",
    content: []
  };

  // Process each content block and convert to TipTap format
  contentBlocks.forEach(block => {
    switch (block.type) {
      case "paragraph":
        tipTapDoc.content.push({
          type: "paragraph",
          content: block.content ? [{ type: "text", text: block.content }] : []
        });
        break;
      
      case "heading":
        tipTapDoc.content.push({
          type: "heading",
          attrs: { level: block.level || 1 },
          content: block.content ? [{ type: "text", text: block.content }] : []
        });
        break;
      
      case "image":
        if (block.url) {
          tipTapDoc.content.push({
            type: "image",
            attrs: {
              src: block.url,
              alt: block.alt || "",
              title: block.alt || ""
            }
          });
        }
        break;
      
      default:
        // For unknown types, add as paragraph
        tipTapDoc.content.push({
          type: "paragraph",
          content: block.content ? [{ type: "text", text: block.content }] : []
        });
    }
  });

  return JSON.stringify(tipTapDoc);
}

/**
 * Converts TipTap JSON to HTML for display
 * @param tiptapJson TipTap JSON content as string
 * @returns HTML string
 */
export function convertTipTapToHtml(tiptapJson: string): string {
  try {
    const content = JSON.parse(tiptapJson);
    return renderNodeToHtml(content);
  } catch (error) {
    console.error("Error parsing TipTap JSON:", error);
    return "<p>Error rendering content</p>";
  }
}

/**
 * Recursively renders TipTap nodes to HTML
 */
function renderNodeToHtml(node: any): string {
  if (!node) return '';

  // Handle text nodes
  if (node.type === 'text') {
    let text = node.text || '';
    
    // Apply marks if present
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach((mark: any) => {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `<s>${text}</s>`;
            break;
          case 'code':
            text = `<code>${text}</code>`;
            break;
          case 'link':
            text = `<a href="${mark.attrs?.href || '#'}" ${mark.attrs?.target ? `target="${mark.attrs.target}"` : ''}>${text}</a>`;
            break;
        }
      });
    }
    
    return text;
  }

  // Handle block nodes
  let html = '';
  
  switch (node.type) {
    case 'doc':
      html = renderChildrenToHtml(node);
      break;
      
    case 'paragraph':
      html = `<p${node.attrs?.textAlign ? ` style="text-align: ${node.attrs.textAlign}"` : ''}>${renderChildrenToHtml(node)}</p>`;
      break;
      
    case 'heading':
      const level = node.attrs?.level || 1;
      html = `<h${level}${node.attrs?.textAlign ? ` style="text-align: ${node.attrs.textAlign}"` : ''}>${renderChildrenToHtml(node)}</h${level}>`;
      break;
      
    case 'bulletList':
      html = `<ul>${renderChildrenToHtml(node)}</ul>`;
      break;
      
    case 'orderedList':
      html = `<ol>${renderChildrenToHtml(node)}</ol>`;
      break;
      
    case 'listItem':
      html = `<li>${renderChildrenToHtml(node)}</li>`;
      break;
      
    case 'blockquote':
      html = `<blockquote>${renderChildrenToHtml(node)}</blockquote>`;
      break;
      
    case 'codeBlock':
      const language = node.attrs?.language || '';
      html = `<pre><code${language ? ` class="language-${language}"` : ''}>${renderChildrenToHtml(node)}</code></pre>`;
      break;
      
    case 'image':
      html = `<img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" title="${node.attrs?.title || ''}" />`;
      break;
      
    case 'hardBreak':
      html = '<br>';
      break;
      
    case 'imageGenerator':
      // Render the image generator component for display
      const prompt = node.attrs?.prompt || '';
      const generatedImageUrl = node.attrs?.generatedImageUrl || '';
      
      if (generatedImageUrl && prompt) {
        html = `
          <div class="image-generator-display" data-prompt="${encodeURIComponent(prompt)}" data-image-url="${generatedImageUrl}">
            <div class="image-generator-content">
              <div class="generated-image-container">
                <img src="${generatedImageUrl}" alt="Generated from prompt: ${prompt}" class="generated-image" />
              </div>
              <div class="prompt-display">
                <div class="prompt-label">AI Generated Image Prompt:</div>
                <div class="prompt-text">${prompt}</div>
                <button 
                  class="try-prompt-button"
                  onclick="window.open('/yaart?prompt=${encodeURIComponent(prompt)}', '_blank')"
                  style="
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: #f0f0f0;
                    border: 1px solid #d0d0d0;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #333;
                    text-decoration: none;
                    margin-top: 8px;
                    transition: background-color 0.2s;
                  "
                  onmouseover="this.style.backgroundColor='#e0e0e0'"
                  onmouseout="this.style.backgroundColor='#f0f0f0'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="17" y1="10" x2="3" y2="10"></line>
                    <polyline points="3,6 3,14"></polyline>
                  </svg>
                  Try this prompt
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        // If no image generated yet, don't render anything in the published view
        html = '';
      }
      break;
      
    default:
      // For unknown types, render children
      html = renderChildrenToHtml(node);
  }
  
  return html;
}

/**
 * Helper function to render children of a node
 */
function renderChildrenToHtml(node: any): string {
  if (!node.content || !Array.isArray(node.content)) {
    return '';
  }
  
  return node.content.map((child: any) => renderNodeToHtml(child)).join('');
}

/**
 * Converts TipTap JSON to legacy content blocks format
 * This is used for backward compatibility
 * @param tiptapJson TipTap JSON content as string
 * @returns Array of legacy content blocks
 */
export function convertTipTapToBlocks(tiptapJson: string): EditorContent[] {
  try {
    const content = JSON.parse(tiptapJson);
    const blocks: EditorContent[] = [];
    
    if (!content.content || !Array.isArray(content.content)) {
      return [{ type: "paragraph", content: "" }];
    }
    
    content.content.forEach((node: any) => {
      switch (node.type) {
        case "paragraph":
          blocks.push({
            type: "paragraph",
            content: extractTextContent(node)
          });
          break;
          
        case "heading":
          blocks.push({
            type: "heading",
            level: node.attrs?.level || 1,
            content: extractTextContent(node)
          });
          break;
          
        case "image":
          blocks.push({
            type: "image",
            content: "",
            url: node.attrs?.src || "",
            alt: node.attrs?.alt || ""
          });
          break;
          
        // For other block types, convert to paragraph
        default:
          const text = extractTextContent(node);
          if (text) {
            blocks.push({
              type: "paragraph",
              content: text
            });
          }
      }
    });
    
    // If no blocks were created, add an empty paragraph
    if (blocks.length === 0) {
      blocks.push({ type: "paragraph", content: "" });
    }
    
    return blocks;
  } catch (error) {
    console.error("Error parsing TipTap JSON:", error);
    return [{ type: "paragraph", content: "" }];
  }
}

/**
 * Helper function to extract text content from a node
 */
function extractTextContent(node: any): string {
  if (!node.content || !Array.isArray(node.content)) {
    return "";
  }
  
  return node.content.map((child: any) => {
    if (child.type === "text") {
      return child.text || "";
    } else if (child.content) {
      return extractTextContent(child);
    }
    return "";
  }).join("");
}

/**
 * Determines if content is in TipTap format
 * @param content Content to check
 * @returns Boolean indicating if content is in TipTap format
 */
export function isTipTapContent(content: any): boolean {
  if (typeof content !== 'string') return false;
  
  try {
    const parsed = JSON.parse(content);
    return parsed.type === 'doc' && Array.isArray(parsed.content);
  } catch (error) {
    return false;
  }
}

/**
 * Renders content regardless of format (TipTap or legacy blocks)
 * @param content Content to render
 * @returns HTML string
 */
export function renderContent(content: any): string {
  // If content is a string, try to parse it as TipTap JSON
  if (typeof content === 'string') {
    try {
      if (isTipTapContent(content)) {
        return convertTipTapToHtml(content);
      }
    } catch (error) {
      console.error("Error rendering TipTap content:", error);
    }
  }
  
  // If content is an array, assume it's legacy content blocks
  if (Array.isArray(content)) {
    // Convert to TipTap first, then to HTML
    const tiptapJson = convertBlocksToTipTap(content);
    return convertTipTapToHtml(tiptapJson);
  }
  
  // Fallback for unknown content format
  return '<p>Unable to render content</p>';
}

/**
 * Extracts plain text from content for search purposes
 * @param content Content to extract text from (TipTap JSON, legacy blocks, or string)
 * @returns Plain text string
 */
export function extractPlainText(content: any): string {
  if (!content) return '';
  
  // If content is a string, try to parse it as TipTap JSON
  if (typeof content === 'string') {
    try {
      if (isTipTapContent(content)) {
        const parsed = JSON.parse(content);
        return extractTextFromTipTapNode(parsed);
      } else {
        // Plain text or HTML - strip HTML tags
        return content.replace(/<[^>]*>/g, '').trim();
      }
    } catch (error) {
      // If parsing fails, treat as plain text
      return content.replace(/<[^>]*>/g, '').trim();
    }
  }
  
  // If content is an array (legacy blocks)
  if (Array.isArray(content)) {
    return content.map(block => {
      if (block.content) {
        return block.content;
      }
      return '';
    }).join(' ').trim();
  }
  
  // If content is an object (TipTap JSON object)
  if (typeof content === 'object' && content !== null) {
    try {
      return extractTextFromTipTapNode(content);
    } catch (error) {
      return '';
    }
  }
  
  return '';
}

/**
 * Helper function to extract text from TipTap node recursively
 */
function extractTextFromTipTapNode(node: any): string {
  if (!node) return '';
  
  // If it's a text node, return the text
  if (node.type === 'text') {
    return node.text || '';
  }
  
  // If it has content, recursively extract text from children
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractTextFromTipTapNode(child)).join(' ');
  }
  
  return '';
}

/**
 * Extracts context around a search term in text
 * @param text Full text to search in
 * @param searchTerm Term to find
 * @param wordsBefore Number of words to include before the match (default: 3)
 * @param wordsAfter Number of words to include after the match (default: 5)
 * @returns Object with context and highlighted text, or null if not found
 */
export function extractSearchContext(
  text: string, 
  searchTerm: string, 
  wordsBefore: number = 3, 
  wordsAfter: number = 5
): { context: string; highlightedContext: string } | null {
  if (!text || !searchTerm) return null;
  
  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  // Find the position of the search term
  const matchIndex = lowerText.indexOf(lowerSearchTerm);
  if (matchIndex === -1) return null;
  
  // Split text into words
  const words = text.split(/\s+/);
  const lowerWords = words.map(word => word.toLowerCase());
  
  // Find which word contains the search term
  let matchWordIndex = -1;
  for (let i = 0; i < lowerWords.length; i++) {
    if (lowerWords[i].includes(lowerSearchTerm)) {
      matchWordIndex = i;
      break;
    }
  }
  
  if (matchWordIndex === -1) return null;
  
  // Calculate start and end indices for context
  const startIndex = Math.max(0, matchWordIndex - wordsBefore);
  const endIndex = Math.min(words.length, matchWordIndex + wordsAfter + 1);
  
  // Extract context words
  const contextWords = words.slice(startIndex, endIndex);
  const context = contextWords.join(' ');
  
  // Create highlighted version
  const highlightedContext = context.replace(
    new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi'),
    '<mark class="search-highlight">$1</mark>'
  );
  
  return {
    context,
    highlightedContext
  };
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensures content is properly formatted for TipTap editor
 * Handles cases where content might be double-serialized
 * @param content Content to normalize
 * @returns Properly formatted TipTap JSON string
 */
export function normalizeTipTapContent(content: any): string {
  // If not provided, return empty document
  if (!content) {
    return JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }]
    });
  }
  
  // If already a string, check if it's valid JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      
      // Check if this is a TipTap document
      if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
        return content; // Already correctly formatted
      }
      
      // Check if this is a double-serialized TipTap document
      if (typeof parsed === 'string') {
        try {
          const doubleChecked = JSON.parse(parsed);
          if (doubleChecked.type === 'doc' && Array.isArray(doubleChecked.content)) {
            return parsed; // Return the inner content (first level of deserialization)
          }
        } catch (e) {
          // Not double-serialized, continue
        }
      }
    } catch (e) {
      // Not valid JSON, treat as plain text
      return JSON.stringify({
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: content }]
        }]
      });
    }
  }
  
  // If it's an array, assume it's legacy content blocks
  if (Array.isArray(content)) {
    return convertBlocksToTipTap(content);
  }
  
  // If it's an object and looks like a TipTap document
  if (typeof content === 'object' && content.type === 'doc' && Array.isArray(content.content)) {
    return JSON.stringify(content);
  }
  
  // Fallback: return empty document
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }]
  });
}
