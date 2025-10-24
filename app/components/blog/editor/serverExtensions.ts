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
import { DragHandleExtension } from '../editor/DragHandleExtension';
import { ResizableImage } from './resizableImageOnly';

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
];

export { ResizableImage };