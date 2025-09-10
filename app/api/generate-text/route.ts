import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { prompt, systemPrompt, messageContext, model } = await request.json();

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

    // Prepare messages for the API
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({ role: 'system', text: systemPrompt });
    }
    
    // Add message context (conversation history) if provided
    if (messageContext && messageContext.length > 0) {
      messages.push(...messageContext);
    } 
    // If no context is provided, just add the user prompt
    else if (prompt) {
      messages.push({ role: 'user', text: prompt });
    }

    // Call YandexGPT API using the new endpoint
    const folderId = process.env.YANDEX_FOLDER_ID || 'b1gb5lrqp1jr1tmamu2t';
    
    // Determine the model URI based on the selected model
    let modelUri: string;
    switch (model) {
      case 'gpt-oss-20b':
        modelUri = `gpt://${folderId}/gpt-oss-20b/latest`;
        break;
      case 'deepseek':
        // Assuming deepseek uses a different endpoint or model URI
        // Fallback to yandexgpt for now as deepseek may not be available
        console.log('Warning: deepseek requested, falling back to yandexgpt');
        modelUri = `gpt://${folderId}/yandexgpt/latest`;
        break;
      case 'yandexgpt':
      default:
        modelUri = `gpt://${folderId}/yandexgpt/latest`;
        break;
    }
    
    const requestBody = {
      modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.6,
        maxTokens: '2000'
      },
      messages
    };

    console.log('Yandex API request:', {
      modelUri,
      messagesCount: messages.length,
      selectedModel: model,
      folderId: folderId
    });

    const yandexGPTResponse = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!yandexGPTResponse.ok) {
      const errorText = await yandexGPTResponse.text();
      console.error('YandexGPT API error:', yandexGPTResponse.status, errorText);
      throw new Error(`YandexGPT API error: ${yandexGPTResponse.status} ${errorText}`);
    }

    const result = await yandexGPTResponse.json();
    console.log('YandexGPT API response:', result);
    
    // Extract the text from the response
    const generatedText = result.result?.alternatives?.[0]?.message?.text;
    
    if (!generatedText) {
      throw new Error('No text found in the response');
    }

    // Extract token usage information
    const usage = result.result?.usage ? {
      inputTextTokens: result.result.usage.inputTextTokens,
      completionTokens: result.result.usage.completionTokens,
      totalTokens: result.result.usage.totalTokens
    } : undefined;
    
    return NextResponse.json({
      text: generatedText,
      usage
    });

  } catch (error) {
    console.error('Error in generate-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
