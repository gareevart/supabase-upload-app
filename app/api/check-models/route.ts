import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
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

    // Check for API key
    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YandexGPT API key not configured' },
        { status: 500 }
      );
    }

    const folderId = process.env.YANDEX_FOLDER_ID || 'b1gb5lrqp1jr1tmamu2t';
    
    // Test different model URIs
    const modelsToTest = [
      { name: 'yandexgpt', uri: `gpt://${folderId}/yandexgpt/latest` },
      { name: 'yandexgpt-lite', uri: `gpt://${folderId}/yandexgpt-lite/latest` },
      { name: 'gpt-oss-20b', uri: `gpt://${folderId}/gpt-oss-20b/latest`, note: 'Недоступна в данном каталоге' },
      { name: 'deepseek', uri: `gpt://${folderId}/deepseek/latest`, note: 'Использует fallback на YandexGPT' }
    ];

    const results = [];

    for (const model of modelsToTest) {
      try {
        const testResponse = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${apiKey}`
          },
          body: JSON.stringify({
            modelUri: model.uri,
            completionOptions: {
              stream: false,
              temperature: 0.6,
              maxTokens: '10'
            },
            messages: [{ role: 'user', text: 'test' }]
          })
        });

        results.push({
          name: model.name,
          uri: model.uri,
          available: testResponse.ok,
          status: testResponse.status,
          error: testResponse.ok ? null : await testResponse.text(),
          note: model.note || null
        });
      } catch (error) {
        results.push({
          name: model.name,
          uri: model.uri,
          available: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          note: model.note || null
        });
      }
    }

    return NextResponse.json({
      folderId,
      models: results
    });

  } catch (error) {
    console.error('Error in check-models API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
