import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getProviderModel } from '@/lib/chatModels';
import { createDeepSeekCompletion, toDeepSeekMessages } from '@/lib/deepseek';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

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

    const chatModel = getProviderModel(model);
    if (!chatModel) {
      return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
    }

    // Prepare messages for the API
    const messages = [];

    // Add system prompt if provided
    const finalSystemPrompt = systemPrompt || 'You are a helpful assistant.';
    messages.push({ role: 'system', text: finalSystemPrompt });

    // Add message context (conversation history) if provided
    if (messageContext && messageContext.length > 0) {
      messages.push(...messageContext);
    }
    // If no context is provided, just add the user prompt
    else if (prompt) {
      messages.push({ role: 'user', text: prompt });
    }

    const completion = await createDeepSeekCompletion({
      model: chatModel,
      messages: toDeepSeekMessages(messages),
      temperature: 0.6,
      maxTokens: 4096,
    });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: completion.text })}\n\n`));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in generate-text-stream API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
