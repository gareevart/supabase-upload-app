
interface YandexEmbeddingResponse {
    embedding: number[];
    numTokens: string;
}

export async function getEmbeddings(text: string, type: 'QUERY' | 'DOC' = 'DOC'): Promise<number[]> {
    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID || 'b1gb5lrqp1jr1tmamu2t';

    if (!apiKey) {
        throw new Error('YANDEX_API_KEY is not defined');
    }

    // Choose model based on type
    // text-search-query for queries
    // text-search-doc for documents
    const model = type === 'QUERY' ? 'text-search-query' : 'text-search-doc';
    const modelUri = `emb://${folderId}/${model}/latest`;

    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${apiKey}`
        },
        body: JSON.stringify({
            modelUri,
            text,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Yandex API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as YandexEmbeddingResponse;
    const embedding = data.embedding;
    console.log(`Generated embedding (type: ${type}, length: ${embedding.length})`);
    return embedding;
}
