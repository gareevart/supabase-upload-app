// Dynamic loader for mammoth module
export async function loadMammoth() {
	try {
		const mammoth = require('mammoth');
		return mammoth;
	} catch (error) {
		console.error('Failed to load mammoth:', error);
		throw new Error('Mammoth module not available');
	}
}
