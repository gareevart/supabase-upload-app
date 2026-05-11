/**
 * Converts TipTap JSON document to Markdown.
 * Handles all node types used in the blog editor.
 */

export function convertTipTapToMarkdown(tiptapJson: string): string {
  try {
    const doc = JSON.parse(tiptapJson);
    if (doc.type !== 'doc' || !Array.isArray(doc.content)) {
      return tiptapJson;
    }
    return renderDoc(doc).trim();
  } catch {
    return tiptapJson;
  }
}

function renderDoc(doc: any): string {
  return (doc.content ?? []).map((n: any) => renderBlock(n)).filter(Boolean).join('\n\n');
}

function renderBlock(node: any): string {
  if (!node) return '';

  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content ?? []);

    case 'heading': {
      const level = node.attrs?.level ?? 1;
      return `${'#'.repeat(level)} ${renderInline(node.content ?? [])}`;
    }

    case 'bulletList':
      return (node.content ?? [])
        .map((item: any) => renderListItem(item, false, 0))
        .join('\n');

    case 'orderedList':
      return (node.content ?? [])
        .map((item: any, i: number) => renderListItem(item, true, 0, i + 1))
        .join('\n');

    case 'blockquote': {
      const inner = (node.content ?? []).map((n: any) => renderBlock(n)).join('\n\n');
      return inner.split('\n').map((line: string) => `> ${line}`).join('\n');
    }

    case 'codeBlock': {
      const lang = node.attrs?.language ?? '';
      const code = (node.content ?? []).map((n: any) => n.text ?? '').join('');
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case 'image':
    case 'resizableImage': {
      const src = node.attrs?.src ?? '';
      const alt = node.attrs?.alt ?? '';
      return src ? `![${alt}](${src})` : '';
    }

    case 'imageGenerator': {
      const src = node.attrs?.generatedImageUrl ?? '';
      const prompt = node.attrs?.prompt ?? '';
      return src ? `![AI: ${prompt}](${src})` : '';
    }

    case 'horizontalRule':
      return '---';

    case 'hardBreak':
      return '';

    default:
      return (node.content ?? []).map((n: any) => renderBlock(n)).filter(Boolean).join('\n\n');
  }
}

function renderListItem(node: any, ordered: boolean, depth: number, index = 1): string {
  const indent = '  '.repeat(depth);
  const prefix = ordered ? `${index}. ` : '- ';
  const lines: string[] = [];

  for (const child of (node.content ?? [])) {
    if (child.type === 'paragraph') {
      lines.push(`${indent}${prefix}${renderInline(child.content ?? [])}`);
    } else if (child.type === 'bulletList') {
      const nested = (child.content ?? [])
        .map((item: any) => renderListItem(item, false, depth + 1))
        .join('\n');
      lines.push(nested);
    } else if (child.type === 'orderedList') {
      const nested = (child.content ?? [])
        .map((item: any, i: number) => renderListItem(item, true, depth + 1, i + 1))
        .join('\n');
      lines.push(nested);
    }
  }

  return lines.length ? lines.join('\n') : `${indent}${prefix}`;
}

function renderInline(nodes: any[]): string {
  return (nodes ?? []).map(renderInlineNode).join('');
}

function renderInlineNode(node: any): string {
  if (!node) return '';
  if (node.type === 'hardBreak') return '  \n';
  if (node.type !== 'text') {
    return renderInline(node.content ?? []);
  }

  let text = node.text ?? '';
  if (!text) return '';

  const marks: any[] = node.marks ?? [];
  const hasBold = marks.some((m: any) => m.type === 'bold');
  const hasItalic = marks.some((m: any) => m.type === 'italic');
  const hasCode = marks.some((m: any) => m.type === 'code');
  const hasUnderline = marks.some((m: any) => m.type === 'underline');
  const hasStrike = marks.some((m: any) => m.type === 'strike');
  const hasSubscript = marks.some((m: any) => m.type === 'subscript');
  const hasSuperscript = marks.some((m: any) => m.type === 'superscript');
  const linkMark = marks.find((m: any) => m.type === 'link');

  if (hasCode) return `\`${text}\``;

  if (hasSubscript) text = `<sub>${text}</sub>`;
  if (hasSuperscript) text = `<sup>${text}</sup>`;
  if (hasUnderline) text = `<u>${text}</u>`;
  if (hasStrike) text = `~~${text}~~`;
  if (hasItalic) text = `_${text}_`;
  if (hasBold) text = `**${text}**`;
  if (linkMark) text = `[${text}](${linkMark.attrs?.href ?? ''})`;

  return text;
}
