import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageGeneratorComponent from '../components/ImageGeneratorComponent';

export interface ImageGeneratorOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGenerator: {
      insertImageGenerator: () => ReturnType;
    };
  }
}

export const ImageGenerator = Node.create<ImageGeneratorOptions>({
  name: 'imageGenerator',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      prompt: {
        default: '',
        parseHTML: element => element.getAttribute('data-prompt'),
        renderHTML: attributes => {
          if (!attributes.prompt) {
            return {};
          }
          return {
            'data-prompt': attributes.prompt,
          };
        },
      },
      generatedImageUrl: {
        default: '',
        parseHTML: element => element.getAttribute('data-generated-image-url'),
        renderHTML: attributes => {
          if (!attributes.generatedImageUrl) {
            return {};
          }
          return {
            'data-generated-image-url': attributes.generatedImageUrl,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-generator"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-generator' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGeneratorComponent);
  },

  addCommands() {
    return {
      insertImageGenerator:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              prompt: '',
              generatedImageUrl: '',
            },
          });
        },
    };
  },
});

export default ImageGenerator;
