import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';
import { DOMSerializer } from '@tiptap/pm/model';

export interface DragHandleOptions {
  dragHandleWidth: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dragHandle: {
      hideDragHandle: () => ReturnType;
    };
  }
}

function absoluteRect(node: Element) {
  const data = node.getBoundingClientRect();
  return {
    top: data.top,
    left: data.left,
    width: data.width,
    height: data.height,
  };
}

function nodeDOMAtCoords(coords: { x: number; y: number }) {
  return document
    .elementsFromPoint(coords.x, coords.y)
    .find(
      (elem: Element) =>
        elem.parentElement?.matches?.('.ProseMirror') ||
        elem.matches?.(
          [
            'li',
            'p',
            'pre',
            'blockquote',
            'h1, h2, h3, h4, h5, h6',
            '.resizable-image',
            '.image-resizer-container',
            'ul, ol',
            'div[data-type]'
          ].join(', '),
        ),
    );
}

function nodePosAtDOM(node: Element, view: EditorView): number | null {
  const boundingRect = node.getBoundingClientRect();
  const result = view.posAtCoords({
    left: boundingRect.left + 1,
    top: boundingRect.top + 1,
  });
  return result?.pos ?? null;
}

function DragHandle(options: DragHandleOptions) {
  let dragHandleElement: HTMLElement | null = null;
  let isDragging = false;

  function handleDragStart(event: DragEvent, view: EditorView) {
    if (!event.dataTransfer) return;

    view.focus();
    isDragging = true;

    const node = nodeDOMAtCoords({
      x: event.clientX + 50 + options.dragHandleWidth,
      y: event.clientY,
    });

    if (!(node instanceof Element)) return;

    const nodePos = nodePosAtDOM(node, view);
    if (nodePos == null || nodePos < 0) return;

    // Select the node
    const resolvedPos = view.state.doc.resolve(nodePos);
    let selection;
    
    // Find the block node to select
    let depth = resolvedPos.depth;
    while (depth > 0) {
      const nodeAtDepth = resolvedPos.node(depth);
      if (nodeAtDepth.isBlock && nodeAtDepth.type.name !== 'doc') {
        const start = resolvedPos.start(depth);
        const end = resolvedPos.end(depth);
        selection = NodeSelection.create(view.state.doc, start - 1);
        break;
      }
      depth--;
    }
    
    // Fallback to text selection if no block found
    if (!selection) {
      if (resolvedPos.parent.inlineContent) {
        const start = resolvedPos.start();
        const end = resolvedPos.end();
        selection = TextSelection.create(view.state.doc, start, end);
      } else {
        selection = NodeSelection.create(view.state.doc, nodePos);
      }
    }

    view.dispatch(view.state.tr.setSelection(selection));

    const slice = view.state.selection.content();
    const { dom, text } = serializeForClipboard(view, slice);

    event.dataTransfer.clearData();
    event.dataTransfer.setData('text/html', dom instanceof DocumentFragment ? 
      Array.from(dom.childNodes).map(node => (node as Element).outerHTML || node.textContent).join('') : 
      (dom as Element).outerHTML || '');
    event.dataTransfer.setData('text/plain', text);
    event.dataTransfer.effectAllowed = 'copyMove';

    // Create a drag image
    const dragImage = node.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.pointerEvents = 'none';
    event.dataTransfer.setDragImage(dragImage, 0, 0);

    // Store the slice for later use
    (view as any).dragging = { slice, move: !event.ctrlKey };
  }

  function handleClick(event: MouseEvent, view: EditorView) {
    view.focus();

    const node = nodeDOMAtCoords({
      x: event.clientX + 50 + options.dragHandleWidth,
      y: event.clientY,
    });

    if (!(node instanceof Element)) return;

    const nodePos = nodePosAtDOM(node, view);
    if (nodePos == null || nodePos < 0) return;

    // Select the node on click
    const resolvedPos = view.state.doc.resolve(nodePos);
    let selection;
    
    if (resolvedPos.parent.inlineContent) {
      const start = resolvedPos.start();
      const end = resolvedPos.end();
      selection = TextSelection.create(view.state.doc, start, end);
    } else {
      selection = NodeSelection.create(view.state.doc, nodePos);
    }

    view.dispatch(view.state.tr.setSelection(selection));
  }

  function hideDragHandle() {
    if (dragHandleElement) {
      dragHandleElement.classList.add('hide');
    }
  }

  function showDragHandle() {
    if (dragHandleElement) {
      dragHandleElement.classList.remove('hide');
    }
  }

  return new Plugin({
    key: new PluginKey('dragHandle'),
    view: (view) => {
      dragHandleElement = document.createElement('div');
      dragHandleElement.draggable = true;
      dragHandleElement.dataset.dragHandle = '';
      dragHandleElement.classList.add('drag-handle');
      
      // Add drag handle icon
      dragHandleElement.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <path d="M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z" fill="currentColor"/>
        </svg>
      `;
      
      dragHandleElement.addEventListener('dragstart', (e) => {
        handleDragStart(e, view);
      });
      
      dragHandleElement.addEventListener('click', (e) => {
        handleClick(e, view);
      });

      // Initially hide the drag handle
      dragHandleElement.style.opacity = '0';

      // Ensure parent container has relative positioning
      const parentElement = view?.dom?.parentElement;
      if (parentElement) {
        const parentStyle = window.getComputedStyle(parentElement);
        if (parentStyle.position === 'static') {
          parentElement.style.position = 'relative';
        }
        // Ensure no overflow hidden that might clip the drag handle
        if (parentStyle.overflow === 'hidden') {
          parentElement.style.overflow = 'visible';
        }
      }
      
      view?.dom?.parentElement?.appendChild?.(dragHandleElement);

      return {
        destroy: () => {
          dragHandleElement?.remove?.();
          dragHandleElement = null;
        },
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable || isDragging) {
            return;
          }

          const node = nodeDOMAtCoords({
            x: event.clientX,
            y: event.clientY,
          });

          if (!(node instanceof Element)) {
            hideDragHandle();
            return;
          }

          const compStyle = window.getComputedStyle(node);
          const lineHeight = parseInt(compStyle.lineHeight, 10);
          const paddingTop = parseInt(compStyle.paddingTop, 10);

          const rect = absoluteRect(node);
          const editorRect = view.dom.getBoundingClientRect();

          rect.top += (lineHeight - 24) / 2;
          rect.top += paddingTop;
          
          // Don't adjust rect.left here, do it in the positioning calculation

          if (dragHandleElement) {
            // Position relative to the editor container
            const editorContainer = view.dom.parentElement;
            if (editorContainer) {
              const containerRect = editorContainer.getBoundingClientRect();
              // Calculate position: place drag handle to the left of the node
              let leftPos = rect.left - containerRect.left - options.dragHandleWidth - 5;
              
              // Adjust for list items (move further left)
              if (node.matches('li, li *')) {
                leftPos -= 15;
              }
              
              // Ensure drag handle is visible (minimum 5px from left edge)
              leftPos = Math.max(5, leftPos);
              
              const topPos = rect.top - containerRect.top + editorContainer.scrollTop;
              
              dragHandleElement.style.left = `${leftPos}px`;
              dragHandleElement.style.top = `${topPos}px`;
              showDragHandle();
            }
          }
        },
        keydown: () => {
          hideDragHandle();
        },
        mousewheel: () => {
          hideDragHandle();
        },
        dragstart: (view) => {
          view.dom.classList.add('dragging');
          isDragging = true;
        },
        dragover: (view, event) => {
          if (isDragging) {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'move';
            return true;
          }
          return false;
        },
        drop: (view, event) => {
          view.dom.classList.remove('dragging');
          isDragging = false;
          
          if (!event.dataTransfer) return false;

          const eventCoords = { x: event.clientX, y: event.clientY };
          const targetNode = nodeDOMAtCoords(eventCoords);
          if (!targetNode) return false;

          const targetPos = nodePosAtDOM(targetNode, view);
          if (targetPos == null || targetPos < 0) return false;

          view.focus();

          const slice = (view as any).dragging?.slice;
          const isMove = (view as any).dragging?.move;
          if (!slice) return false;

          // Get the current selection position before any changes
          const { from, to } = view.state.selection;
          
          // Calculate the target position for insertion
          let insertPos = targetPos;
          const resolvedTargetPos = view.state.doc.resolve(targetPos);
          
          // Find the appropriate insertion point
          if (resolvedTargetPos.parent.inlineContent) {
            // If we're in inline content, find the parent block
            let depth = resolvedTargetPos.depth;
            while (depth > 0 && resolvedTargetPos.node(depth).inlineContent) {
              depth--;
            }
            if (depth >= 0) {
              const blockPos = resolvedTargetPos.start(depth + 1);
              insertPos = blockPos;
            }
          } else {
            // For block content, insert before the target node
            insertPos = resolvedTargetPos.before(resolvedTargetPos.depth);
          }

          // Create the transaction
          let tr = view.state.tr;

          if (isMove && from !== undefined && to !== undefined) {
            // For move operations, we need to be careful about position mapping
            if (insertPos <= from) {
              // Inserting before the original position
              tr = tr.insert(insertPos, slice.content);
              tr = tr.delete(tr.mapping.map(from), tr.mapping.map(to));
            } else {
              // Inserting after the original position
              tr = tr.delete(from, to);
              const mappedInsertPos = tr.mapping.map(insertPos);
              tr = tr.insert(mappedInsertPos, slice.content);
            }
          } else {
            // For copy operations, just insert
            tr = tr.insert(insertPos, slice.content);
          }

          view.dispatch(tr);
          event.preventDefault();
          return true;
        },
        dragend: (view) => {
          view.dom.classList.remove('dragging');
          isDragging = false;
        },
      },
    },
  });
}

// Simplified serialization function
function serializeForClipboard(view: EditorView, slice: any) {
  const { content } = slice;
  
  // Use DOMSerializer from the schema
  const serializer = view.someProp('clipboardSerializer') || 
                    DOMSerializer.fromSchema(view.state.schema);
  
  let dom: DocumentFragment | Element;
  
  if (serializer && typeof serializer.serializeFragment === 'function') {
    dom = serializer.serializeFragment(content, { document });
  } else {
    // Fallback: create a simple DOM representation
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    div.textContent = content.textBetween(0, content.size, '\n');
    fragment.appendChild(div);
    dom = fragment;
  }
  
  let text = '';
  if (dom.textContent) {
    text = dom.textContent;
  }
  
  return { dom, text };
}

export const DragHandleExtension = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      dragHandleWidth: 20,
    };
  },

  addCommands() {
    return {
      hideDragHandle:
        () =>
        ({ commands }) => {
          return commands.focus();
        },
    };
  },

  addProseMirrorPlugins() {
    return [DragHandle(this.options)];
  },
});