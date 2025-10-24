import { Image } from '@tiptap/extension-image';
import { type RawCommands } from '@tiptap/core';

export const ResizableImage = Image.extend({
	name: 'resizableImage',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			src: { default: null },
			alt: { default: null },
			title: { default: null },
			width: {
				default: null,
				parseHTML: el => el.getAttribute('width'),
				renderHTML: attrs => (attrs.width ? { width: attrs.width } : {}),
			},
			height: {
				default: null,
				parseHTML: el => el.getAttribute('height'),
				renderHTML: attrs => (attrs.height ? { height: attrs.height } : {}),
			},
			'data-alignment': {
				default: 'center',
				parseHTML: el => el.getAttribute('data-alignment') || 'center',
				renderHTML: attrs => {
					const alignment = attrs['data-alignment'] || 'center';
					let style = '';
					if (attrs.width) style += `width: ${attrs.width}px;`;
					if (attrs.height) style += `height: ${attrs.height}px;`;
					return {
						'data-alignment': alignment,
						class: 'resizable-image',
						...(style && { style }),
					};
				},
			},
		};
	},

	// No custom node view needed for server‑side rendering
	addNodeView() {
		return null as any;
	},

	// Commands – using any to avoid strict RawCommands typing issues
	addCommands(): Partial<RawCommands> {
		return {
			insertResizableImage:
				() =>
					({ commands }: any) => {
						return commands.insertContent({
							type: this.name,
							attrs: { src: '', alt: '', title: '' },
						});
					},
		} as Partial<RawCommands>;
	},
});