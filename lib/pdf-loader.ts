// Dynamic loader for pdf2json module
export async function loadPDFParser() {
	try {
		const PDFParser = require('pdf2json');
		return PDFParser;
	} catch (error) {
		console.error('Failed to load pdf2json:', error);
		throw new Error('PDFParser module not available');
	}
}
