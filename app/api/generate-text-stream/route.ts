import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

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
        let { data: searchResults, error: searchError } = await (admin || supabase).rpc('match_blog_posts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.05,
          match_count: 5
        });
        if ((!searchResults || searchResults.length === 0) && !searchError) {
          const retry = await (admin || supabase).rpc('match_blog_posts', {
            query_embedding: queryEmbedding,
            match_threshold: 0.02,
            match_count: 5
          });
          searchResults = retry.data || [];
          searchError = retry.error || null;
        }
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

    if (finalSystemPrompt) {
      messages.push({ role: 'system', text: finalSystemPrompt });
    }

    // Add message context (conversation history) if provided
    if (messageContext && messageContext.length > 0) {
      messages.push(...messageContext);
    }
    // If no context is provided, just add the user prompt
    else if (prompt) {
      messages.push({ role: 'user', text: prompt });
    }

    // Determine the model URI
    let modelUri: string;
    switch (model) {
      case 'gpt-oss-20b':
        // GPT OSS 20B модель недоступна в данном каталоге
        console.log('Warning: gpt-oss-20b requested but not available, returning error');
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

    // Prepare completion options for streaming
    const completionOptions: any = {
      stream: true,
      temperature: reasoningMode ? 0.1 : 0.6,
      maxTokens: reasoningMode ? '1000' : '2000'
    };

    // Add reasoning options if reasoning mode is enabled
    // Only YandexGPT supports reasoning mode
    if (reasoningMode && model === 'yandexgpt') {
      console.log('Adding reasoning options for YandexGPT streaming');
      completionOptions.reasoningOptions = {
        mode: "ENABLED_HIDDEN"
      };
      completionOptions.reasoning_effort = "low";
    } else if (reasoningMode && model !== 'yandexgpt') {
      console.log('Reasoning mode requested but only supported for YandexGPT, current model:', model);
    }

    const requestBody = {
      modelUri,
      completionOptions,
      messages
    };

    console.log('Yandex API streaming request:', {
      modelUri,
      messagesCount: messages.length,
      selectedModel: model,
      reasoningMode: reasoningMode,
      streaming: true
    });

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        // Prepare metadata for sources
        // Ensure we have title/slug in streaming metadata as well
        let enrichedDocs = documents || [];
        const missingMeta = enrichedDocs.some((d: any) => !d.title || !d.slug);
        if (missingMeta) {
          try {
            const postIds = Array.from(new Set(enrichedDocs.map((d: any) => d.post_id).filter(Boolean)));
            if (postIds.length > 0) {
              const { data: postsMeta } = await supabase
                .from('blog_posts')
                .select('id, title, slug')
                .in('id', postIds);
              const byId = new Map((postsMeta || []).map((p: any) => [p.id, p]));
              enrichedDocs = enrichedDocs.map((d: any) => {
                const meta = byId.get(d.post_id);
                return meta ? { ...d, title: d.title || meta.title, slug: d.slug || meta.slug } : d;
              });
            }
          } catch {}
        }

        const uniqueSources = Array.from(new Map(
          (enrichedDocs || []).map((doc: any) => [doc.post_id, { title: doc.title || 'Blog post', slug: doc.slug }])
        ).values()).filter((s: any) => s.slug || s.title);

        if (uniqueSources.length > 0) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ metadata: { sources: uniqueSources } })}\n\n`));
        }

        try {
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
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: `YandexGPT API error: ${yandexGPTResponse.status}` })}\n\n`));
            controller.close();
            return;
          }

          const reader = yandexGPTResponse.body?.getReader();
          if (!reader) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`));
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);

                  // Forward the streaming data to the client
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(parsed)}\n\n`));
                } catch (e) {
                  console.error('Error parsing streaming data:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
