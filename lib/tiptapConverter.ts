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