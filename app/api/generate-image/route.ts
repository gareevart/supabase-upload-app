import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.YANDEX_CLOUD_API_KEY;
    const folderId = process.env.YANDEX_CLOUD_FOLDER;
    const modelName = process.env.ALICEAI_AI_ART_MODEL;

    if (!apiKey || !folderId || !modelName) {
      console.error('Missing env vars: YANDEX_CLOUD_API_KEY, YANDEX_CLOUD_FOLDER, ALICEAI_AI_ART_MODEL');
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
      throw new Error(`Image generation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;

    if (!b64) {
      console.error('No image data in response:', data);
      throw new Error('No image data in response');
    }

    return NextResponse.json({ imageData: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error('Error in generate-image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
