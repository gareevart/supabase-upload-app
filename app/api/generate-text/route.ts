import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { prompt, systemPrompt, messageContext, model, reasoningMode } = await request.json();

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

    const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER || 'b1gb5lrqp1jr1tmamu2t';

    // RAG Implementation: Retrieve context from blog posts
    let contextText = '';
    let documents: any[] = [];
    try {
      // Determine the search query
      let searchQuery = prompt;
      if (!searchQuery && messageContext && messageContext.length > 0) {
        // Use the last user message as query if prompt is empty
        const lastUserMessage = [...messageContext].reverse().find((m: any) => m.role === 'user');
        if (lastUserMessage) {
          searchQuery = lastUserMessage.text || lastUserMessage.content;
        }
      }

      if (searchQuery) {
        console.log('Generating embedding for query:', searchQuery);

        // Dynamic import to avoid issues if lib/yandex is not perfectly robust yet
        const { getEmbeddings } = await import('@/lib/yandex');
        const queryEmbedding = await getEmbeddings(searchQuery, 'QUERY');

        // Search for similar blog posts
        const { data: searchResults, error: searchError } = await supabase.rpc('match_blog_posts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1, // Threshold for relevance
          match_count: 3 // Top 3 results
        });
        documents = searchResults || [];

        if (searchError) {
          console.error('Error searching documents:', searchError);
        } else if (documents && documents.length > 0) {
          console.log(`Found ${documents.length} relevant documents`);
          console.log('Similarity scores:', documents.map((doc: any) => doc.similarity).join(', '));

          contextText = documents.map((doc: any) => doc.content).join('\n---\n');
          console.log('Context preview:', contextText.substring(0, 100) + '...');
        } else {
          console.log('No relevant documents found');
        }
      }
    } catch (ragError) {
      console.error('RAG Error:', ragError);
      // Continue without context if RAG fails
    }

    // Prepare messages for the API
    const messages = [];

    // Add system prompt if provided
    let finalSystemPrompt = systemPrompt || 'You are a helpful assistant.';

    if (contextText) {
      finalSystemPrompt += `\n\nUse the following context from the user's blog to answer the question if relevant:\n\n${contextText}\n\nIf the context doesn't contain the answer, answer from your general knowledge but prioritize the context.`;
    }

    if (finalSystemPrompt && finalSystemPrompt.trim()) {
      messages.push({ role: 'system', text: finalSystemPrompt.trim() });
    }

    // Add message context (conversation history) if provided
    if (messageContext && messageContext.length > 0) {
      console.log('Message context before filtering:', messageContext.length);
      // Filter out empty messages
      const validMessages = messageContext.filter((msg: any) =>
        msg && msg.text && msg.text.trim().length > 0
      );
      console.log('Valid messages after filtering:', validMessages.length);
      messages.push(...validMessages);
    }
    // If no context is provided, just add the user prompt
    else if (prompt && prompt.trim()) {
      messages.push({ role: 'user', text: prompt.trim() });
    }

    // Ensure we have at least one non-system message
    const nonSystemMessagesCount = messages.filter(msg => msg.role !== 'system').length;
    if (nonSystemMessagesCount === 0) {
      console.error('No valid messages after filtering');
      return NextResponse.json(
        { error: 'No valid messages to send to YandexGPT' },
        { status: 400 }
      );
    }

    console.log('Final messages count:', messages.length, '(non-system:', nonSystemMessagesCount, ')');

    // Determine the model URI based on the selected model
    let modelUri: string;
    switch (model) {
      case 'gpt-oss-20b':
        console.log('Warning: gpt-oss-20b requested but not available, falling back to yandexgpt');
        return NextResponse.json(
          { error: 'Модель GPT OSS 20B недоступна в вашем каталоге. Попробуйте использовать YandexGPT или YandexGPT Lite.' },
          { status: 400 }
        );
      case 'yandexgpt-lite':
        modelUri = `gpt://${folderId}/yandexgpt-lite/latest`;
        break;
      case 'deepseek':
        console.log('Warning: deepseek requested, falling back to yandexgpt');
        modelUri = `gpt://${folderId}/yandexgpt/latest`;
        break;
      case 'yandexgpt':
      default:
        modelUri = `gpt://${folderId}/yandexgpt/latest`;
        break;
    }

    // Prepare completion options
    const completionOptions: any = {
      stream: false,
      temperature: reasoningMode ? 0.1 : 0.6,
      maxTokens: reasoningMode ? '1000' : '2000'
    };

    // Add reasoning options if reasoning mode is enabled
    if (reasoningMode && model === 'yandexgpt') {
      console.log('Adding reasoning options for YandexGPT');
      completionOptions.reasoningOptions = {
        mode: "ENABLED_HIDDEN"
      };
      completionOptions.reasoning_effort = "low";
    }

    const requestBody = {
      modelUri,
      completionOptions,
      messages
    };

    console.log('Yandex API request:', {
      modelUri,
      messagesCount: messages.length,
      selectedModel: model,
      folderId: folderId,
      reasoningMode: reasoningMode,
      completionOptions
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
      totalTokens: result.result.usage.totalTokens,
      reasoningTokens: result.result.usage.reasoningTokens || 0
    } : undefined;

    // Extract unique sources for metadata
    const uniqueSources = Array.from(new Map(
      ((documents as any[]) || []).map((doc: any) => [doc.post_id, { title: doc.title, slug: doc.slug }])
    ).values());

    return NextResponse.json({
      text: generatedText,
      usage,
      metadata: uniqueSources.length > 0 ? { sources: uniqueSources } : undefined
    });

  } catch (error) {
    console.error('Error in generate-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
