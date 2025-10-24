// Dynamic loader for tiptapToHtml to avoid build-time issues
export async function loadTiptapToHtml() {
	try {
		const { tiptapToHtml } = await import('@/app/utils/tiptapToHtml');
		return tiptapToHtml;
	} catch (error) {
		console.error('Failed to load tiptapToHtml:', error);
		throw new Error('tiptapToHtml module not available');
	}
}
