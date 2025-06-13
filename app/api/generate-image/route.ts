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

    // Fetch the image data from the URL to return both URL and data
    try {
      const imageResponse = await fetch(data.result.image.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Data = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:${imageResponse.headers.get('content-type') || 'image/jpeg'};base64,${base64Data}`;
      
      // Return both the URL and the base64 image data
      return NextResponse.json({
        imageUrl: data.result.image.url,
        imageData: dataUrl
      });
    } catch (imageError) {
      console.error('Error fetching image data:', imageError);
      // If we can't fetch the image data, just return the URL
      return NextResponse.json({ imageUrl: data.result.image.url });
    }
  } catch (error) {
    console.error('Detailed error in generate-image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
} 