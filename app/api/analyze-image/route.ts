import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { imageUrl, imageType } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Get Yandex API key and folder ID
    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;
    
    if (!apiKey || !folderId) {
      return NextResponse.json(
        { error: 'Yandex Vision API not configured' },
        { status: 500 }
      );
    }

    console.log('Analyzing image:', { imageUrl, imageType, folderId });

    // Download image from URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log('Image downloaded, size:', imageBuffer.byteLength, 'bytes');

    // Call Yandex Vision API for OCR and classification
    const visionResponse = await fetch('https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        folderId: folderId,
        analyze_specs: [
          {
            content: base64Image,
            features: [
              { 
                type: 'TEXT_DETECTION',
                text_detection_config: {
                  language_codes: ['ru', 'en']
                }
              }, // OCR для текста
              { type: 'CLASSIFICATION' }, // Классификация содержимого
            ],
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Yandex Vision API error:', visionResponse.status, errorText);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    console.log('Vision API response received');
    
    // Log full response for debugging (only first 2000 chars to avoid flooding)
    const responsePreview = JSON.stringify(visionResult, null, 2).substring(0, 2000);
    console.log('Vision API full response preview:', responsePreview);
    
    console.log('Vision API results structure:', {
      hasResults: !!visionResult.results,
      resultsLength: visionResult.results?.length,
      firstResult: visionResult.results?.[0] ? {
        hasResults: !!visionResult.results[0].results,
        hasTextDetection: !!visionResult.results[0].results?.textDetection,
        hasClassification: !!visionResult.results[0].results?.classification,
        hasError: !!visionResult.results[0].error
      } : null
    });
    
    // Extract text and classification results
    let extractedText = '';
    let imageClassification = '';
    let fullDescription = '';
    
    if (visionResult.results?.[0]) {
      const result = visionResult.results[0];
      
      // Extract OCR text - results is an array!
      if (result.results?.[0]?.textDetection) {
        const textDetection = result.results[0].textDetection;
        const pages = textDetection.pages || [];
        console.log('Text detection found! Pages:', {
          pagesCount: pages.length,
          hasBlocks: pages[0]?.blocks?.length > 0
        });
        
        extractedText = pages
          .flatMap((page: any) => page.blocks || [])
          .flatMap((block: any) => block.lines || [])
          .flatMap((line: any) => line.words || [])
          .map((word: any) => word.text)
          .join(' ');
        
        console.log('Extracted text:', extractedText);
      } else {
        console.log('No textDetection in result');
      }
      
      // Extract classification (may not always be available) - also check array
      if (result.results?.[1]?.classification && !result.error) {
        const classification = result.results[1].classification;
        const properties = classification.properties || [];
        const topProperties = properties
          .filter((prop: any) => prop.probability > 0.3)
          .slice(0, 5);
        
        if (topProperties.length > 0) {
          imageClassification = topProperties
            .map((prop: any) => `${prop.name} (${(prop.probability * 100).toFixed(0)}%)`)
            .join(', ');
          
          console.log('Classification:', imageClassification);
        }
      } else if (result.error) {
        console.log('Classification error (non-critical):', result.error.message);
      }

      // Create a comprehensive description
      const descriptionParts = [];
      
      // Always provide some description
      if (extractedText) {
        descriptionParts.push(`Текст на изображении: "${extractedText}"`);
      }
      
      if (imageClassification) {
        descriptionParts.push(`Содержимое изображения: ${imageClassification}`);
      } else if (!extractedText) {
        // If no text and no classification, provide generic description
        descriptionParts.push('Изображение содержит визуальную информацию');
      }

      fullDescription = descriptionParts.join('. ') || 'Изображение загружено';
    } else {
      // Fallback if no results
      fullDescription = 'Изображение загружено, но детальный анализ недоступен';
    }

    console.log('Final analysis result:', {
      extractedText: extractedText.substring(0, 100),
      imageClassification,
      fullDescription,
      success: !!fullDescription
    });

    return NextResponse.json({
      text: extractedText,
      classification: imageClassification,
      description: fullDescription,
      success: true,
    });

  } catch (error) {
    console.error('Error in analyze-image API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        text: '',
        classification: '',
        description: '',
        success: false
      },
      { status: 500 }
    );
  }
}

