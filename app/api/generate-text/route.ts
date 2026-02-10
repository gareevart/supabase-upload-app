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
    webSearchQuery,
    chatId
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
    // Admin client to bypass RLS for internal RAG queries (server-side only)
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

    const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER || 'b1gb5lrqp1jr1tmamu2t';

    // Retrieval thresholds and limits (auto-mode)
    const THRESH_HIGH = 0.12; // high match
    const THRESH_LOW = 0.04;  // low match
    const MAX_DOCS = 3;
    const TOP_CHUNKS_PER_MSG = 3;
    type Mode = 'DOCS_STRICT' | 'DOCS_PREFERRED' | 'GENERAL' | 'WEB';
    let mode: Mode = 'GENERAL';
    let bestScore = 0;

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

    // RAG Implementation: Retrieve context from per-chat documents (user uploads/messages)
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

        const { getEmbeddings } = await import('@/lib/yandex');
        const queryEmbedding = await getEmbeddings(searchQuery, 'QUERY');

        if (chatId) {
          let { data: searchResults, error: searchError } = await (admin || supabase).rpc('match_chat_messages', {
            query_embedding: queryEmbedding,
            match_chat_id: chatId,
            match_threshold: 0.0,
            match_count: 20
          });
          documents = searchResults || [];
          if (searchError) {
            console.error('Error searching chat documents:', searchError);
          } else if (documents && documents.length > 0) {
            // Group chunks by message and compute per-message scores
            type DocRow = { message_id: string; content: string; similarity: number };
            const byMessage = new Map<string, DocRow[]>();
            (documents as DocRow[]).forEach((row) => {
              const arr = byMessage.get(row.message_id) || [];
              arr.push(row);
              byMessage.set(row.message_id, arr);
            });
            // sort chunks inside each group by similarity desc and keep top N
            const perMessageTop: { message_id: string; topChunk: DocRow; topChunks: DocRow[]; score: number }[] = [];
            for (const [messageId, rows] of byMessage.entries()) {
              rows.sort((a, b) => b.similarity - a.similarity);
              const top = rows.slice(0, TOP_CHUNKS_PER_MSG);
              const score = top[0]?.similarity || 0;
              perMessageTop.push({ message_id: messageId, topChunk: top[0], topChunks: top, score });
            }
            // Decide mode and select top documents
            bestScore = perMessageTop.reduce((m, g) => Math.max(m, g.score), 0);
            const high = perMessageTop.filter((g) => g.score >= THRESH_HIGH).sort((a, b) => b.score - a.score);
            const mid = perMessageTop.filter((g) => g.score >= THRESH_LOW && g.score < THRESH_HIGH).sort((a, b) => b.score - a.score);

            let selected: typeof perMessageTop = [];
            if (high.length > 0) {
              mode = 'DOCS_STRICT';
              selected = high.slice(0, MAX_DOCS);
            } else if (mid.length > 0) {
              mode = 'DOCS_PREFERRED';
              selected = mid.slice(0, MAX_DOCS);
            } else {
              mode = 'GENERAL';
            }

            if (selected.length > 0) {
              const sections = selected.map((g, idx) => {
                const body = g.topChunks.map((r) => r.content).join('\n');
                return `Документ ${idx + 1}:\n${body}`;
              });
              contextText = sections.join('\n---\n');
              documents = selected.map((g) => ({ message_id: g.message_id, topChunk: g.topChunk }));
              console.log(`Auto-mode=${mode} docs=${selected.length} bestScore=${bestScore.toFixed(3)}`);
            } else {
              documents = [] as any;
              contextText = '';
              console.log(`Auto-mode=GENERAL (no relevant docs). bestScore=${bestScore.toFixed(3)}`);
            }
          } else {
            console.log('No chat documents found');
          }
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

    // Decide whether to enable web search (heuristic)
    const looksTimely = /\b(сегодня|сейчас|новост|последн(яя|ий)\s+(верси|релиз)|курс|цен[аы]|когда\s+выйдет|\d{4}|\?|обновлени|релиз)\b/i.test(userQuestion);
    let doWebSearch = false;
    if (bestScore < THRESH_LOW && looksTimely) {
      doWebSearch = true;
      mode = 'WEB';
    }

    // Web search (generative response) integration
    let webSearchSummary = '';
    let webSearchSources: Array<{ title: string; url: string; snippet?: string }> = [];
    let webArticlesContext = '';
    let webEvidenceContext = '';
    let webArticlesSummary = '';
    let webEntityList = '';
    if (doWebSearch) {
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

    // Build system prompt depending on auto-mode
    let finalSystemPrompt = '';
    if (mode === 'DOCS_STRICT') {
      finalSystemPrompt = (systemPrompt && systemPrompt.trim()) || 'Ты ассистент, который отвечает ТОЛЬКО фактами из контекста документов. Если сведений недостаточно — прямо скажи об этом.';
      if (contextText) {
        finalSystemPrompt += `\n\nКонтекст (фрагменты документов):\n\n${contextText}\n\nПравила: отвечай только по контексту, без внешних знаний.`;
      }
    } else if (mode === 'DOCS_PREFERRED') {
      finalSystemPrompt = (systemPrompt && systemPrompt.trim()) || 'Ты ассистент, который опирается на контекст документов, избегая неподтверждённых утверждений. Если фактов не хватает — укажи, чего не хватает.';
      if (contextText) {
        finalSystemPrompt += `\n\nКонтекст (фрагменты документов):\n\n${contextText}\n\nПравила: опирайся на контекст; не выдумывай данные; отмечай пробелы информации.`;
      }
    } else if (mode === 'WEB') {
      finalSystemPrompt = (systemPrompt && systemPrompt.trim()) || 'Ты ассистент-исследователь. Используй предоставленный веб-контекст, дай краткий и фактический ответ на русском. Не спекулируй.';
    } else {
      // GENERAL
      finalSystemPrompt = (systemPrompt && systemPrompt.trim()) || 'Ты полезный ассистент. Отвечай понятно и по делу.';
    }

    // Add web context only when WEB mode is active
    if (mode === 'WEB' && (webSearchSummary || webSearchSources.length > 0)) {
      const formattedSources = formatWebSources(webSearchSources);
      finalSystemPrompt += `\n\nYou have access to web search results below. Use them to answer the user and do not say you cannot access real-time information.\n` +
        `${webSearchSummary ? `\nSummary:\n${webSearchSummary}\n` : ''}` +
        `${formattedSources ? `\nSources:\n${formattedSources}\n` : ''}` +
        `\nIf the web data is insufficient, explain the limitation briefly and answer using general knowledge without disclaimers about internet access.`;
    }

    if (finalSystemPrompt && finalSystemPrompt.trim()) {
      messages.push({ role: 'system', text: finalSystemPrompt.trim() });
    }

    if (mode === 'WEB' && (webSearchSources.length > 0 || webSearchSummary || webEvidenceContext)) {
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

    if (mode === 'WEB' && (webSearchSources.length > 0 || webSearchSummary)) {
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
      temperature: reasoningMode ? 0.1 : ( (mode === 'WEB') ? 0.2 : 0.6),
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

    if (mode === 'WEB' && webSearchSources.length > 0) {
      generatedText = appendSourcesIfMissing(generatedText, webSearchSources);
    }

    if (mode === 'WEB' && requiresEntityList && webEntityList) {
      generatedText = appendEntityListIfMissing(generatedText, webEntityList);
    }

    // Extract token usage information
    const usage = result.result?.usage ? {
      inputTextTokens: result.result.usage.inputTextTokens,
      completionTokens: result.result.usage.completionTokens,
      totalTokens: result.result.usage.totalTokens,
      reasoningTokens: result.result.usage.reasoningTokens || 0
    } : undefined;

    // Build sources per mode: docs-only sources OR web sources OR none
    let combinedSources: any[] = [];
    try {
      if (mode === 'WEB') {
        combinedSources = (webSearchSources || []).map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          type: 'web'
        }));
      } else if (mode === 'DOCS_STRICT' || mode === 'DOCS_PREFERRED') {
        const topPerMessage = (documents as any[]) || [];
        const messageIds = topPerMessage.map((d: any) => d.message_id).filter(Boolean);
        if (messageIds.length > 0) {
          const { data: msgMeta } = await (admin || supabase)
            .from('chat_messages')
            .select('id, attachments, created_at')
            .in('id', messageIds);
          const byId = new Map((msgMeta || []).map((m: any) => [m.id, m]));
          const sources: any[] = [];
          topPerMessage.forEach((item: any, idx: number) => {
            const meta = byId.get(item.message_id);
            const snippet = (item.topChunk?.content || '').slice(0, 200);
            const files = Array.isArray(meta?.attachments) ? meta.attachments : [];
            if (files.length > 0) {
              files.forEach((file: any) => {
                sources.push({
                  title: file?.name || `Файл ${idx + 1}`,
                  url: file?.url || undefined,
                  snippet,
                  type: 'doc'
                });
              });
            } else {
              sources.push({
                title: `Сообщение ${idx + 1}`,
                snippet,
                type: 'doc'
              });
            }
          });
          combinedSources = sources;
        }
      } else {
        combinedSources = [];
      }
    } catch (e) {
      console.log('Sources build error, falling back:', e);
      combinedSources = [];
    }

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
