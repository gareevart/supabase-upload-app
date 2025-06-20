export interface EditorContent {
  type: "paragraph" | "heading" | "image";
  content: string;
  level?: 1 | 2 | 3;
  url?: string;
  alt?: string;
}

export function parseContentToHTML(content: any): string {
  // Если контент строка, пытаемся распарсить как JSON
  if (typeof content === 'string') {
    // Сначала проверяем, не является ли это JSON строкой
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        const parsedContent = JSON.parse(content);
        return parseContentToHTML(parsedContent); // Рекурсивно вызываем для распарсенного объекта
      } catch (e) {
        // Если не удалось распарсить как JSON, обрабатываем как обычный текст/HTML
        return formatText(content);
      }
    }
    // Если это обычная строка, обрабатываем как текст
    return formatText(content);
  }

  // Если контент объект с html свойством
  if (typeof content === 'object' && content?.html) {
    return content.html;
  }

  // Если контент в формате TipTap JSON (с type: "doc" и content массивом)
  if (typeof content === 'object' && content?.type === 'doc' && Array.isArray(content?.content)) {
    return parseTipTapContent(content.content);
  }

  console.log('Parser input:', content);
  
  // Если контент массив, проверяем, что это за массив
  if (Array.isArray(content)) {
    console.log('Processing array content');
    
    // Если это массив TipTap узлов (каждый элемент имеет type)
    if (content.length > 0 && content[0]?.type) {
      try {
        const result = parseTipTapContent(content);
        console.log('TipTap parse result:', result);
        return result;
      } catch (e: unknown) {
        console.error('TipTap parse error:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        return `<div class="parse-error">Error parsing TipTap content: ${message}</div>`;
      }
    }
    
    // Если это массив EditorContent объектов или строк
    return content.map((block: EditorContent | string) => {
      console.log('Processing block:', block);
      
      // Handle string content
      if (typeof block === 'string') {
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(block);
          return parseContentToHTML(parsed);
        } catch {
          return `<p>${formatText(block)}</p>`;
        }
      }
      
      // Handle stringified JSON content in paragraphs
      if (typeof block.content === 'string') {
        try {
          console.log('Parsing nested content:', block.content);
          const parsedContent = JSON.parse(block.content);
          const result = parseContentToHTML(parsedContent);
          console.log('Nested parse result:', result);
          return result;
        } catch (e: unknown) {
          console.error('Nested parse error:', e);
          const message = e instanceof Error ? e.message : 'Unknown error';
          return `<div class="parse-error">${formatText(block.content)}<br/><small>Parse error: ${message}</small></div>`;
        }
      }
      
      // Handle regular EditorContent objects
      try {
        switch (block.type) {
        case 'paragraph':
          return `<p>${formatText(block.content)}</p>`;
        
        case 'heading':
          const level = block.level || 1;
          return `<h${level}>${formatText(block.content)}</h${level}>`;
        
        case 'image':
          return `<img src="${block.url}" alt="${block.alt || ''}" class="w-full h-auto rounded-lg my-4" />`;
        
        default:
          return `<p>${formatText(block.content)}</p>`;
      }
      } catch (e: unknown) {
        console.error('EditorContent parse error:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        return `<div class="parse-error">Error processing content: ${message}</div>`;
      }
    }).join('\n');
  }

  // Если ничего не подошло, возвращаем JSON как fallback
  return `<pre class="bg-gray-100 p-4 rounded overflow-auto">${JSON.stringify(content, null, 2)}</pre>`;
}

function parseTipTapContent(nodes: any[]): string {
  return nodes.map(node => parseTipTapNode(node)).filter(html => html).join('\n');
}

function parseTipTapNode(node: any): string {
  if (!node || !node.type) return '';

  switch (node.type) {
    case 'paragraph':
      const paragraphContent = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return paragraphContent ? `<p>${paragraphContent}</p>` : '';

    case 'heading':
      const level = node.attrs?.level || 1;
      const headingContent = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return headingContent ? `<h${level}>${headingContent}</h${level}>` : '';

    case 'text':
      let text = node.text || '';
      
      // Применяем форматирование на основе marks
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'code':
              text = `<code>${text}</code>`;
              break;
            case 'link':
              const href = mark.attrs?.href || '#';
              text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
              break;
          }
        });
      }
      
      return text;

    case 'image':
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      return src ? `<img src="${src}" alt="${alt}" class="w-full h-auto rounded-lg my-4" />` : '';

    case 'reactComponent':
      // Обрабатываем React компоненты (например, code-block)
      if (node.attrs?.type === 'code-block') {
        const language = node.attrs?.props?.language || '';
        const code = node.attrs?.props?.code || '';
        return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
      }
      return '';

    case 'codeBlock':
      const language = node.attrs?.language || '';
      const codeContent = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-${language}">${codeContent}</code></pre>`;

    case 'blockquote':
      const quoteContent = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return `<blockquote class="border-l-4 border-gray-300 pl-4 italic">${quoteContent}</blockquote>`;

    case 'bulletList':
      const listItems = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return `<ul class="list-disc list-inside">${listItems}</ul>`;

    case 'orderedList':
      const orderedItems = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return `<ol class="list-decimal list-inside">${orderedItems}</ol>`;

    case 'listItem':
      const itemContent = (node.content && Array.isArray(node.content)) ? node.content.map(parseTipTapNode).join('') : '';
      return `<li>${itemContent}</li>`;

    case 'hardBreak':
      return '<br>';

    default:
      // Для неизвестных типов пытаемся обработать содержимое
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(parseTipTapNode).join('');
      }
      return '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatText(text: string): string {
  if (!text) return '';
  
  // Сначала обрабатываем специальные символы и форматирование
  let formattedText = text
    // Обрабатываем изображения в формате ![alt](url) - ВАЖНО: делаем это первым, до обработки ссылок
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full h-auto rounded-lg my-4" />')
    // Обрабатываем жирный текст в формате ** текст **
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Обрабатываем курсив в формате * текст *
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Обрабатываем код в формате ` код `
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Обрабатываем ссылки в формате [текст](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Разбиваем на абзацы по двойным переносам строк
  const paragraphs = formattedText.split(/\n\s*\n/);
  
  return paragraphs
    .map(paragraph => {
      // Заменяем одинарные переносы строк на <br>
      const processedParagraph = paragraph.replace(/\n/g, '<br>');
      return processedParagraph.trim();
    })
    .filter(p => p.length > 0)
    .join('</p><p>');
}
