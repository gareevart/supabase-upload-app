
import { useState, useRef } from 'react';

interface Selection {
  start: number;
  end: number;
}

export function useTextFormatting(
  text: string,
  setText: (text: string) => void,
  onChange: (text: string) => void
) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track selection changes
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      });
    }
  };

  // Focus and restore selection
  const focusWithSelection = (newSelection?: Selection) => {
    const sel = newSelection || selection;
    if (textareaRef.current && sel) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(sel.start, sel.end);
    }
  };

  // Get selected text
  const getSelectedText = (): string => {
    if (!textareaRef.current || !selection) return '';
    return text.substring(selection.start, selection.end);
  };

  // Check if selection has formatting
  const hasFormat = (prefix: string, suffix = prefix): boolean => {
    if (!selection) return false;
    const selectedText = getSelectedText();
    
    if (!selectedText) return false;
    
    const beforeSelection = text.substring(0, selection.start);
    const afterSelection = text.substring(selection.end);
    
    return beforeSelection.endsWith(prefix) && afterSelection.startsWith(suffix);
  };

  // Apply formatting to selected text
  const applyFormatting = (prefix: string, suffix = prefix) => {
    if (!textareaRef.current || !selection) return;
    
    const beforeSelection = text.substring(0, selection.start);
    const selectedText = getSelectedText();
    const afterSelection = text.substring(selection.end);
    
    if (!selectedText) {
      // If no text is selected, insert placeholder with formatting
      const placeholder = prefix === '`' ? 'code' : 'text';
      const newText = 
        beforeSelection + 
        prefix + placeholder + suffix + 
        afterSelection;
      
      const newSelection = {
        start: selection.start + prefix.length,
        end: selection.start + prefix.length + placeholder.length
      };
      
      setText(newText);
      onChange(newText);
      
      setTimeout(() => {
        focusWithSelection(newSelection);
      }, 0);
      return;
    }
    
    // Check if the selection already has this formatting
    const isAlreadyFormatted = hasFormat(prefix, suffix);
    
    let newText;
    let newSelection;
    
    if (isAlreadyFormatted) {
      // Remove formatting
      newText = 
        beforeSelection.substring(0, beforeSelection.length - prefix.length) + 
        selectedText + 
        afterSelection.substring(suffix.length);
      
      newSelection = {
        start: selection.start - prefix.length,
        end: selection.end - prefix.length
      };
    } else {
      // Add formatting
      newText = 
        beforeSelection + 
        prefix + selectedText + suffix + 
        afterSelection;
      
      newSelection = {
        start: selection.start + prefix.length,
        end: selection.end + prefix.length
      };
    }
    
    setText(newText);
    onChange(newText);
    
    setTimeout(() => {
      focusWithSelection(newSelection);
    }, 0);
  };

  // Apply list formatting
  const applyList = (prefix: string) => {
    if (!textareaRef.current || !selection) return;
    
    const lines = text.split('\n');
    let lineStart = 0;
    let currentLine = 0;
    
    // Find which line the selection starts on
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for the newline
      if (lineStart + lineLength > selection.start) {
        currentLine = i;
        break;
      }
      lineStart += lineLength;
    }
    
    // Apply list formatting to the current line
    const newLines = [...lines];
    
    // Check if line already has list formatting
    if (newLines[currentLine].startsWith(prefix)) {
      // Remove list formatting
      newLines[currentLine] = newLines[currentLine].substring(prefix.length);
    } else {
      // Add list formatting
      newLines[currentLine] = prefix + newLines[currentLine];
    }
    
    const newText = newLines.join('\n');
    setText(newText);
    onChange(newText);
    
    setTimeout(() => {
      focusWithSelection();
    }, 0);
  };

  // Apply alignment to the current line or selection
  const applyAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!textareaRef.current || !selection) return;
    
    const lineSegments = getLineSegmentsForSelection(selection.start, selection.end);
    if (!lineSegments) return;
    
    const alignmentTags = {
      left: ':::align-left\n',
      center: ':::align-center\n',
      right: ':::align-right\n'
    };
    
    const alignRegex = /^:::align-(left|center|right)\n(.*)\n:::\n?$/;
    const closingTag = '\n:::';
    
    let newText = text;
    let addedChars = 0;
    
    lineSegments.forEach(segment => {
      const currentLine = text.substring(segment.start, segment.end);
      
      // Check if there's already alignment applied
      const alignMatch = currentLine.match(alignRegex);
      
      let replacementText;
      
      if (alignMatch && alignMatch[1] === alignment) {
        // Remove alignment if it's the same
        replacementText = alignMatch[2];
      } else if (alignMatch) {
        // Replace with new alignment
        replacementText = `${alignmentTags[alignment]}${alignMatch[2]}${closingTag}`;
      } else {
        // Add new alignment
        replacementText = `${alignmentTags[alignment]}${currentLine}${closingTag}`;
      }
      
      // Calculate where to insert the new text
      const adjustedStart = segment.start + addedChars;
      const adjustedEnd = segment.end + addedChars;
      
      // Replace the current line with the modified version
      newText = 
        newText.substring(0, adjustedStart) +
        replacementText + 
        newText.substring(adjustedEnd);
      
      // Update the character count change
      addedChars += replacementText.length - (adjustedEnd - adjustedStart);
    });
    
    setText(newText);
    onChange(newText);
    
    setTimeout(() => {
      focusWithSelection();
    }, 0);
  };

  const getLineSegmentsForSelection = (selStart: number, selEnd: number) => {
    if (!text) return null;
    
    // Find line boundaries for the selection
    let lineStart = selStart;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let lineEnd = selEnd;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    return [{ start: lineStart, end: lineEnd }];
  };

  // Insert text at selection
  const insertTextAtSelection = (markdown: string) => {
    if (!selection) {
      // If no selection, insert at current cursor position
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const newText = 
        text.substring(0, cursorPos) + 
        markdown + 
        text.substring(cursorPos);
      
      setText(newText);
      onChange(newText);
      
      const newCursorPos = cursorPos + markdown.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // Replace selected text with markdown
      const newText = 
        text.substring(0, selection.start) + 
        markdown + 
        text.substring(selection.end);
      
      setText(newText);
      onChange(newText);
      
      const newCursorPos = selection.start + markdown.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  return {
    textareaRef,
    selection,
    handleSelectionChange,
    hasFormat,
    applyFormatting,
    applyList,
    applyAlignment,
    insertTextAtSelection,
    getSelectedText
  };
}
