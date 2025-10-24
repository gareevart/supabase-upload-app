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
import { Placeholder } from '@tiptap/extension-placeholder';
import { DragHandleExtension } from './DragHandleExtension';
import { ImageGenerator } from '../extensions/ImageGeneratorExtension';

// Enhanced Resizable Image extension with drag-to-resize functionality
const ResizableImage = Image.extend({
  name: 'resizableImage',
  inline: true,
  atom: true, // Makes it selectable as a single unit

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      'data-alignment': {
        default: 'center',
        parseHTML: element => element.getAttribute('data-alignment') || 'center',
        renderHTML: attributes => {
          let alignment = attributes['data-alignment'] || 'center';
          let style = '';

          if (attributes.width) {
            style += `width: ${attributes.width}px;`;
          }
          if (attributes.height) {
            style += `height: ${attributes.height}px;`;
          }

          return {
            'data-alignment': alignment,
            class: 'resizable-image',
            ...(style && { style }),
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }: any) => {
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.draggable = false;

      // Container for the image and resize handles
      const container = document.createElement('div');
      container.className = 'image-resizer-container';
      container.style.position = 'relative';
      container.style.display = 'inline-block';
      container.style.textAlign = node.attrs['data-alignment'] || 'center';
      container.style.margin = '1rem 0';
      container.style.maxWidth = '100%';

      // Apply initial styles
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '0.375rem';
      img.style.cursor = 'default';

      if (node.attrs.width) {
        img.style.width = typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width;
      }
      if (node.attrs.height) {
        img.style.height = typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height;
      }

      // Resize handles
      const createHandle = (position: string) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${position}`;
        handle.style.position = 'absolute';
        handle.style.width = '12px';
        handle.style.height = '12px';
        handle.style.backgroundColor = '#3b82f6';
        handle.style.border = '2px solid white';
        handle.style.borderRadius = '50%';
        handle.style.cursor = 'pointer';
        handle.style.opacity = '0';
        handle.style.transition = 'opacity 0.2s';
        handle.style.zIndex = '10';

        // Position handles
        switch (position) {
          case 'nw':
            handle.style.top = '-6px';
            handle.style.left = '-6px';
            handle.style.cursor = 'nw-resize';
            break;
          case 'ne':
            handle.style.top = '-6px';
            handle.style.right = '-6px';
            handle.style.cursor = 'ne-resize';
            break;
          case 'sw':
            handle.style.bottom = '-6px';
            handle.style.left = '-6px';
            handle.style.cursor = 'sw-resize';
            break;
          case 'se':
            handle.style.bottom = '-6px';
            handle.style.right = '-6px';
            handle.style.cursor = 'se-resize';
            break;
        }

        return handle;
      };

      const handles = {
        nw: createHandle('nw'),
        ne: createHandle('ne'),
        sw: createHandle('sw'),
        se: createHandle('se'),
      };

      // Resize state
      let isResizing = false;
      let resizeStart = { x: 0, y: 0 };
      let originalSize = { width: 0, height: 0 };
      let aspectRatio = 1;
      let resizeCorner: string | null = null;

      const startResize = (corner: string, event: MouseEvent) => {
        isResizing = true;
        resizeStart = { x: event.clientX, y: event.clientY };
        originalSize = {
          width: img.offsetWidth,
          height: img.offsetHeight,
        };
        aspectRatio = originalSize.width / originalSize.height;
        resizeCorner = corner;
        event.preventDefault();

        // Add visual feedback
        container.style.cursor = `${corner}-resize`;
        img.style.pointerEvents = 'none';
        document.body.style.cursor = `${corner}-resize`;

        // Make all handles visible during resize
        Object.values(handles).forEach(handle => {
          handle.style.opacity = '1';
        });
      };

      const handleResize = (event: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = event.clientX - resizeStart.x;
        const deltaY = event.clientY - resizeStart.y;

        // Calculate the scale delta based on the corner being dragged
        let scaleDelta = 0;

        switch (resizeCorner) {
          case 'se':
            // Use the larger of the two deltas to maintain proportionality
            scaleDelta = Math.max(deltaX / originalSize.width, deltaY / originalSize.height);
            break;
          case 'sw':
            scaleDelta = Math.max(-deltaX / originalSize.width, deltaY / originalSize.height);
            break;
          case 'ne':
            scaleDelta = Math.max(deltaX / originalSize.width, -deltaY / originalSize.height);
            break;
          case 'nw':
            scaleDelta = Math.max(-deltaX / originalSize.width, -deltaY / originalSize.height);
            break;
        }

        // Apply the scale factor proportionally to both dimensions
        const scaleFactor = Math.max(0.2, 1 + scaleDelta); // Minimum 20% of original size
        const newWidth = Math.max(50, originalSize.width * scaleFactor);
        const newHeight = Math.max(50, originalSize.height * scaleFactor);

        // Apply the proportional resize
        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
      };

      const stopResize = () => {
        if (!isResizing) return;

        isResizing = false;
        container.style.cursor = '';
        img.style.pointerEvents = '';
        document.body.style.cursor = '';

        // Apply the final size to the node
        const finalWidth = img.offsetWidth;
        const finalHeight = img.offsetHeight;

        if (typeof getPos === 'function') {
          const pos = getPos();
          editor.commands.setNodeSelection(pos);
          editor.commands.updateAttributes('resizableImage', {
            width: finalWidth,
            height: finalHeight,
          });
        }

        resizeCorner = null;
      };

      // Add event listeners
      Object.entries(handles).forEach(([corner, handle]) => {
        handle.addEventListener('mousedown', (e) => startResize(corner, e));
      });

      // Global event listeners
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);

      // Show/hide handles when hovering
      container.addEventListener('mouseenter', () => {
        if (!isResizing) {
          Object.values(handles).forEach(handle => {
            handle.style.opacity = '1';
          });
        }
      });

      container.addEventListener('mouseleave', () => {
        if (!isResizing) {
          Object.values(handles).forEach(handle => {
            handle.style.opacity = '0';
          });
        }
      });

      // Add elements to container
      container.appendChild(img);
      Object.values(handles).forEach(handle => container.appendChild(handle));

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };

      return {
        dom: container,
        update: (node: any) => {
          if (node.type.name === 'resizableImage') {
            img.src = node.attrs.src;
            img.alt = node.attrs.alt || '';
            container.style.textAlign = node.attrs['data-alignment'] || 'center';

            // Update size
            img.style.width = node.attrs.width ? (typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width) : '';
            img.style.height = node.attrs.height ? (typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height) : '';

            return true;
          }
          return false;
        },
        destroy: cleanup,
      };
    };
  },
});


export const extensions = [
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
  // Keep regular Image extension for backward compatibility
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
  Placeholder.configure({
    placeholder: 'Начните писать...',
  }),
  DragHandleExtension.configure({
    dragHandleWidth: 20,
  }),
  ImageGenerator,
];

export { ResizableImage };