import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: Request) {
  // Use the imported supabase client directly
  const { prompt, systemPrompt, messageContext, model } = await request.json();

  try {
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!process.env.YANDEX_GPT_API_KEY) {
      return NextResponse.json(
        { error: 'YandexGPT API key not configured' },
        { status: 500 }
      );
    }

    // Call YandexGPT API
    const yandexGPTResponse = await fetch('https://llm.api.cloud.yandex.net/llm/v1alpha/instruct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${process.env.YANDEX_GPT_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'general',
        generationOptions: {
          maxTokens: 2000,
          temperature: 0.6
        },
        messages: [
          {
            role: 'system',
            text: systemPrompt || 'Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично.'
          },
          ...(messageContext || []),
          {
            role: 'user',
            text: prompt
          }
        ]
      })
    });

    if (!yandexGPTResponse.ok) {
      const error = await yandexGPTResponse.text();
      throw new Error(`YandexGPT API error: ${error}`);
    }

    const result = await yandexGPTResponse.json();
    
    return NextResponse.json({
      text: result.result.alternatives[0].message.text,
      usage: {
        inputTextTokens: result.result.usage.inputTextTokens,
        completionTokens: result.result.usage.completionTokens,
        totalTokens: result.result.usage.totalTokens
      }
    });

  } catch (error) {
    console.error('Error in generate-text Edge Function:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}