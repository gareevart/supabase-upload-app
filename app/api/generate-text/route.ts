import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchGenerativeSearch, fetchWebPagesContent } from '@/lib/yandexSearch';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const {
    prompt,
    systemPrompt,
    messageContext,
    model,
    reasoningMode,
    useWebSearch,
    webSearchQuery
  } = await request.json();

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

    const callYandexGPT = async (
      modelUri: string,
      messages: any[],
      completionOptions: any
    ) => {
      const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${apiKey}`
        },
        body: JSON.stringify({
          modelUri,
          completionOptions,
          messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YandexGPT API error: ${response.status} ${errorText}`);
      }

      return response.json();
    };

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

    const truncateText = (value: string, maxLength: number) =>
      value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

    const formatWebSources = (
      sources: Array<{ title: string; url: string; snippet?: string }>,
      snippetLimit = 280
    ) =>
      sources
        .map((source) => {
          const snippet = source.snippet ? `\nSnippet: ${truncateText(source.snippet, snippetLimit)}` : '';
          return `- ${source.title}\nURL: ${source.url}${snippet}`;
        })
        .join('\n');

    const buildSourcesContext = (
      sources: Array<{ title: string; url: string; snippet?: string }>
    ) =>
      sources
        .map((source, index) => {
          const snippet = source.snippet ? truncateText(source.snippet, 400) : '';
          return `Source ${index + 1}: ${source.title}\nURL: ${source.url}\n${snippet}`;
        })
        .join('\n\n');

    const countUrls = (text: string) => (text.match(/https?:\/\/\S+/gi) || []).length;

    const appendSourcesIfMissing = (
      text: string,
      _sources: Array<{ title: string; url: string }>
    ) => text;

    const normalizeList = (text: string) =>
      text
        .split('\n')
        .map((line) => line.replace(/^\s*[-*\d.)]+\s*/g, '').trim())
        .filter(Boolean);

    const hasBulletList = (text: string) => /(^|\n)\s*[-*•]\s+\S+/m.test(text);

    const appendEntityListIfMissing = (text: string, entityList: string) => {
      if (!entityList) return text;
      const items = normalizeList(entityList);
      if (!items.length) return text;
      if (hasBulletList(text)) return text;
      const list = items.slice(0, 10).map((item) => `- ${item}`).join('\n');
      return `${text}\n\nСписок заведений:\n${list}`;
    };

    const userQuestion =
      (typeof webSearchQuery === 'string' && webSearchQuery.trim()) ||
      (typeof prompt === 'string' && prompt.trim()) ||
      '';
    const requiresEntityList =
      /(?:какие|перечисли|список|назови)/i.test(userQuestion) &&
      /(?:кафе|ресторан|бар|кофейня|пекарня)/i.test(userQuestion);

    // Web search (generative response) integration
    let webSearchSummary = '';
    let webSearchSources: Array<{ title: string; url: string; snippet?: string }> = [];
    let webArticlesContext = '';
    let webEvidenceContext = '';
    let webArticlesSummary = '';
    let webEntityList = '';
    if (useWebSearch) {
      try {
        if (userQuestion) {
          const webSearchResult = await fetchGenerativeSearch(userQuestion, 5);
          webSearchSummary = webSearchResult.summary || '';
          webSearchSources = webSearchResult.sources || [];

          if (webSearchSources.length > 0) {
            const articles = await fetchWebPagesContent(webSearchSources);
            if (articles.length > 0) {
              const maxTotalChars = 6000;
              let currentTotal = 0;
              const chunks: string[] = [];

              for (const [index, article] of articles.entries()) {
                const text = article.text.slice(0, 1000);
                const chunk = `Article ${index + 1}: ${article.title}\nURL: ${article.url}\nContent:\n${text}`;
                if (currentTotal + chunk.length > maxTotalChars) break;
                chunks.push(chunk);
                currentTotal += chunk.length;
              }

              webArticlesContext = chunks.join('\n\n');
            }
            webEvidenceContext = webArticlesContext || buildSourcesContext(webSearchSources);
          }
        }
      } catch (webSearchError) {
        console.error('Web search error:', webSearchError);
      }
    }

    // Prepare messages for the API
    const messages = [];

    // Add system prompt if provided
    let finalSystemPrompt = systemPrompt || 'You are a helpful assistant.';

    if (contextText) {
      finalSystemPrompt += `\n\nUse the following context from the user's blog to answer the question if relevant:\n\n${contextText}\n\nIf the context doesn't contain the answer, answer from your general knowledge but prioritize the context.`;
    }

    if (webSearchSummary || webSearchSources.length > 0) {
      const formattedSources = formatWebSources(webSearchSources);
      finalSystemPrompt += `\n\nYou have access to web search results below. Use them to answer the user and do not say you cannot access real-time information.\n` +
        `${webSearchSummary ? `\nSummary:\n${webSearchSummary}\n` : ''}` +
        `${formattedSources ? `\nSources:\n${formattedSources}\n` : ''}` +
        `\nIf the web data is insufficient, explain the limitation briefly and answer using general knowledge without disclaimers about internet access.`;
    }

    if (finalSystemPrompt && finalSystemPrompt.trim()) {
      messages.push({ role: 'system', text: finalSystemPrompt.trim() });
    }

    if (webSearchSources.length > 0 || webSearchSummary || webEvidenceContext) {
      if (webEvidenceContext) {
        const summaryMessages = [
          {
            role: 'system',
            text:
              'You are a research assistant. Summarize the key facts from the provided sources. ' +
              'Keep it concise, factual, and avoid speculation. Provide a single summary in Russian. ' +
              'Prefer using at least three different sources and mention concrete facts. ' +
              'If the user asks for a list of venues, include a separate section "Список заведений".'
          },
          {
            role: 'user',
            text: `Question: ${userQuestion}\n\nSources:\n${webEvidenceContext}`
          }
        ];

        try {
          const summaryResult = await callYandexGPT(
            `gpt://${folderId}/yandexgpt/latest`,
            summaryMessages,
            { stream: false, temperature: 0.2, maxTokens: '700' }
          );
          webArticlesSummary = summaryResult.result?.alternatives?.[0]?.message?.text || '';
        } catch (summaryError) {
          console.error('Web articles summary error:', summaryError);
        }
      }

      if (requiresEntityList && webEvidenceContext) {
        const extractMessages = [
          {
            role: 'system',
            text:
              'Extract venue names from the provided sources. ' +
              'Return only a bullet list of venue names in Russian. ' +
              'If no venue names are present, return an empty list.'
          },
          {
            role: 'user',
            text: `Question: ${userQuestion}\n\nSources:\n${webEvidenceContext}`
          }
        ];

        try {
          const extractResult = await callYandexGPT(
            `gpt://${folderId}/yandexgpt/latest`,
            extractMessages,
            { stream: false, temperature: 0.1, maxTokens: '300' }
          );
          webEntityList = extractResult.result?.alternatives?.[0]?.message?.text || '';
        } catch (extractError) {
          console.error('Web entity extraction error:', extractError);
        }
      }

      const shouldIncludeArticleContext = !webArticlesSummary && webEvidenceContext;
      const contextLines = [
        webSearchSummary ? `Summary:\n${webSearchSummary}` : undefined,
        webArticlesSummary ? `Articles summary:\n${webArticlesSummary}` : undefined,
        webEntityList ? `Entity list:\n${webEntityList}` : undefined,
        shouldIncludeArticleContext ? `Sources excerpts:\n${webEvidenceContext}` : undefined,
        webSearchSources.length > 0
          ? `Sources:\n${webSearchSources
              .map((source) => {
                const snippet = source.snippet ? `\nSnippet: ${truncateText(source.snippet, 280)}` : '';
                return `- ${source.title}\nURL: ${source.url}${snippet}`;
              })
              .join('\n')}`
          : undefined
      ]
        .filter(Boolean)
        .join('\n\n');

      if (contextLines.trim()) {
        messages.push({
          role: 'system',
          text:
            `Web search context:\n${contextLines}\n\n` +
            `Instructions (highest priority):\n` +
            `- Use the web search context to answer.\n` +
            `- Do NOT say you lack real-time data or internet access.\n` +
            `- If information is limited, answer based on the sources and say it's a summary of search results.\n` +
            `- Synthesize information from at least 3 sources when possible.\n` +
            `- Do not include sources in the response text.`
        });
      }
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

    if (webSearchSources.length > 0 || webSearchSummary) {
      messages.push({
        role: 'system',
        text:
          `Reminder: web search context is available. Answer using it and never claim lack of real-time access.\n` +
          `Provide a concise summary and 3-6 facts. Do not include sources in the text response.` +
          (requiresEntityList ? `\nProvide a clear list of venue names with short notes.` : '')
      });
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
      temperature: reasoningMode ? 0.1 : (useWebSearch ? 0.2 : 0.6),
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
    let generatedText = result.result?.alternatives?.[0]?.message?.text;

    if (!generatedText) {
      throw new Error('No text found in the response');
    }

    if (useWebSearch && webSearchSources.length > 0) {
      generatedText = appendSourcesIfMissing(generatedText, webSearchSources);
    }

    if (useWebSearch && requiresEntityList && webEntityList) {
      generatedText = appendEntityListIfMissing(generatedText, webEntityList);
    }

    // Extract token usage information
    const usage = result.result?.usage ? {
      inputTextTokens: result.result.usage.inputTextTokens,
      completionTokens: result.result.usage.completionTokens,
      totalTokens: result.result.usage.totalTokens,
      reasoningTokens: result.result.usage.reasoningTokens || 0
    } : undefined;

    // Extract unique sources for metadata
    const blogSources = Array.from(new Map(
      ((documents as any[]) || []).map((doc: any) => [
        doc.post_id,
        { title: doc.title, slug: doc.slug, type: 'blog' }
      ])
    ).values());

    const webSources = (webSearchSources || []).map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      type: 'web'
    }));

    const combinedSources = [...blogSources, ...webSources];

    return NextResponse.json({
      text: generatedText,
      usage,
      metadata: combinedSources.length > 0 ? { sources: combinedSources } : undefined
    });

  } catch (error) {
    console.error('Error in generate-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
