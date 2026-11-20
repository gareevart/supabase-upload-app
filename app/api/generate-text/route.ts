import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WIDGET_GENERATION_SYSTEM_PROMPT, WIDGET_GENERATION_REMINDER } from '@/lib/widgetPrompt';
import { getProviderModel } from '@/lib/chatModels';
import { createDeepSeekCompletion, DeepSeekError, toDeepSeekMessages } from '@/lib/deepseek';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

const DEFAULT_SYSTEM_PROMPT = 'Ты полезный ассистент. Отвечай понятно и по делу.';

// Widget mode is enabled by the explicit UI toggle OR auto-detected from the
// request text ("создай виджет ...", "make a widget ..."), so generation
// works even if the user forgets to press the toggle
const looksLikeWidgetRequest = (text: unknown): boolean =>
  typeof text === 'string' &&
  /(виджет|widget)/i.test(text) &&
  /(созда|сдела|напиш|сгенерир|построй|обнови|измени|доработ|generate|create|make|build|update|change)/i.test(text);

export async function POST(request: Request) {
  const {
    prompt,
    systemPrompt,
    messageContext,
    model,
    widgetMode,
  } = await request.json();

  const lastUserContextText = Array.isArray(messageContext)
    ? [...messageContext].reverse().find((m: any) => m?.role === 'user')?.text
    : undefined;

  const effectiveWidgetMode =
    Boolean(widgetMode) ||
    looksLikeWidgetRequest(prompt) ||
    looksLikeWidgetRequest(lastUserContextText);

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

    // Build the system prompt. Widget mode takes priority over the caller's prompt.
    let finalSystemPrompt = effectiveWidgetMode
      ? WIDGET_GENERATION_SYSTEM_PROMPT
      : (typeof systemPrompt === 'string' && systemPrompt.trim()) || DEFAULT_SYSTEM_PROMPT;

    const messages: Array<{ role: string; text: string }> = [];
    if (finalSystemPrompt.trim()) {
      messages.push({ role: 'system', text: finalSystemPrompt.trim() });
    }

    // Add message context (conversation history) if provided
    if (Array.isArray(messageContext) && messageContext.length > 0) {
      // Filter out empty messages
      const validMessages = messageContext.filter((msg: any) =>
        msg && typeof msg.text === 'string' && msg.text.trim().length > 0
      );
      messages.push(...validMessages);
    } else if (typeof prompt === 'string' && prompt.trim()) {
      // If no context is provided, just add the user prompt
      messages.push({ role: 'user', text: prompt.trim() });
    }

    // Anchor the widget format requirement right before generation —
    // with long histories the model tends to ignore the first system message
    if (effectiveWidgetMode) {
      messages.push({ role: 'system', text: WIDGET_GENERATION_REMINDER });
    }

    // Ensure we have at least one non-system message
    const nonSystemMessagesCount = messages.filter(msg => msg.role !== 'system').length;
    if (nonSystemMessagesCount === 0) {
      console.error('No valid messages after filtering');
      return NextResponse.json(
        { error: 'No valid messages to send to the model' },
        { status: 400 }
      );
    }

    let generatedText: string;
    let usage;
    try {
      const completion = await createDeepSeekCompletion({
        model: chatModel,
        messages: toDeepSeekMessages(messages),
        temperature: effectiveWidgetMode ? 0.3 : 0.6,
        maxTokens: effectiveWidgetMode ? 16384 : 4096,
      });
      generatedText = completion.text;
      usage = completion.usage;
    } catch (error) {
      if (error instanceof DeepSeekError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    return NextResponse.json({
      text: generatedText,
      usage: usage
        ? { ...usage, reasoningTokens: 0 }
        : undefined,
    });

  } catch (error) {
    console.error('Error in generate-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
