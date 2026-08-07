import { NextResponse } from 'next/server';

const DEFAULT_ART_MODEL = 'aliceai-image-art-3.0/latest';

function isAiQuotaExhaustedError(status: number, errorText: string): boolean {
  if (status === 403 || status === 429) {
    return true;
  }

  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('permissiondenied') ||
    normalized.includes('permission_error') ||
    normalized.includes('quota')
  );
}

function getImageMimeFromBase64(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.YANDEX_API_KEY || process.env.YANDEX_CLOUD_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER;
    const modelName = process.env.ALICEAI_AI_ART_MODEL || DEFAULT_ART_MODEL;

    if (!apiKey || !folderId) {
      console.error('Missing env vars: YANDEX_API_KEY (or YANDEX_CLOUD_API_KEY), YANDEX_FOLDER_ID (or YANDEX_CLOUD_FOLDER)');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch('https://ai.api.cloud.yandex.net/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Project': folderId,
      },
      body: JSON.stringify({
        model: `art://${folderId}/${modelName}`,
        prompt,
        response_format: 'b64_json',
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alice AI Art error:', errorText);

      if (isAiQuotaExhaustedError(response.status, errorText)) {
        return NextResponse.json({ error: 'ai_quota_exhausted' }, { status: 503 });
      }

      throw new Error(`Image generation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;

    if (!b64) {
      console.error('No image data in response:', data);
      throw new Error('No image data in response');
    }

    const mimeType = getImageMimeFromBase64(b64);
    return NextResponse.json({ imageData: `data:${mimeType};base64,${b64}` });
  } catch (error) {
    console.error('Error in generate-image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
