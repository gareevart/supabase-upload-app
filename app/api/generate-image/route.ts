import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.YANDEX_API_KEY) {
      console.error('YANDEX_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch('https://functions.yandexcloud.net/d4erqko0mm0vflorvuvd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Yandex Cloud Function error response:', errorText);
      throw new Error(`Yandex Cloud Function error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.result?.image?.url) {
      console.error('No image data in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from image generation service' },
        { status: 500 }
      );
    }

    // Return the base64 image data directly
    return NextResponse.json({ imageUrl: data.result.image.url });
  } catch (error) {
    console.error('Detailed error in generate-image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
} 