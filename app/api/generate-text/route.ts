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

    // Prepare messages for the API
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({ role: 'system', text: systemPrompt.trim() });
    }
    
    // Add message context (conversation history) if provided
    if (messageContext && messageContext.length > 0) {
      console.log('Message context before filtering:', messageContext.length);
      // Filter out empty messages
      const validMessages = messageContext.filter((msg: any) => 
        msg && msg.text && msg.text.trim().length > 0
      );
      console.log('Valid messages after filtering:', validMessages.length);
      if (validMessages.length < messageContext.length) {
        console.log('Filtered out', messageContext.length - validMessages.length, 'empty messages');
      }
      messages.push(...validMessages);
    } 
    // If no context is provided, just add the user prompt
    else if (prompt && prompt.trim()) {
      messages.push({ role: 'user', text: prompt.trim() });
    }
    
    // Ensure we have at least one non-system message
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    if (nonSystemMessages.length === 0) {
      console.error('No valid messages after filtering');
      return NextResponse.json(
        { error: 'No valid messages to send to YandexGPT' },
        { status: 400 }
      );
    }
    
    console.log('Final messages count:', messages.length, '(non-system:', nonSystemMessages.length, ')');

    // Call YandexGPT API using the new endpoint
    const folderId = process.env.YANDEX_FOLDER_ID || process.env.YANDEX_CLOUD_FOLDER || 'b1gb5lrqp1jr1tmamu2t';
    
    // Handle Alice AI LLM separately as it uses a different API
    if (model === 'aliceai-llm') {
      const aliceApiKey = process.env.YANDEX_CLOUD_API_KEY || process.env.YANDEX_API_KEY;
      if (!aliceApiKey) {
        return NextResponse.json(
          { error: 'Yandex Cloud API key not configured for Alice AI' },
          { status: 500 }
        );
      }

      // Prepare input text from messages
      // Build instructions from system prompt
      const systemMessage = messages.find((msg: any) => msg.role === 'system');
      const instructions = systemMessage?.text || systemPrompt || '';

      // Build input from conversation history
      // For Alice AI, we'll format the conversation history as a text
      // Include all non-system messages in chronological order
      const nonSystemMessages = messages.filter((msg: any) => msg.role !== 'system');
      
      let inputText = '';
      
      if (nonSystemMessages.length > 0) {
        // Format conversation history: User: ... Assistant: ...
        const conversationParts = nonSystemMessages.map((msg: any) => {
          const roleLabel = msg.role === 'user' ? 'Пользователь' : 'Ассистент';
          return `${roleLabel}: ${msg.text}`;
        });
        inputText = conversationParts.join('\n\n');
      } else if (prompt) {
        inputText = prompt;
      } else {
        return NextResponse.json(
          { error: 'No input text provided for Alice AI' },
          { status: 400 }
        );
      }

      const aliceModelUri = `gpt://${folderId}/aliceai-llm/latest`;

      const aliceRequestBody = {
        model: aliceModelUri,
        instructions: instructions || '',
        input: inputText,
        temperature: reasoningMode ? 0.1 : 0.3,
        max_output_tokens: reasoningMode ? 500 : 2000,
      };

      console.log('Alice AI API request:', {
        model: aliceModelUri,
        instructionsLength: instructions.length,
        inputLength: inputText.length,
        temperature: aliceRequestBody.temperature,
        max_output_tokens: aliceRequestBody.max_output_tokens,
      });

      const aliceResponse = await fetch('https://rest-assistant.api.cloud.yandex.net/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${aliceApiKey}`,
          'OpenAI-Project': folderId,
        },
        body: JSON.stringify(aliceRequestBody),
      });

      if (!aliceResponse.ok) {
        const errorText = await aliceResponse.text();
        console.error('Alice AI API error:', aliceResponse.status, errorText);
        throw new Error(`Alice AI API error: ${aliceResponse.status} ${errorText}`);
      }

      const aliceResult = await aliceResponse.json();
      console.log('Alice AI API response:', aliceResult);

      // Extract the text from the response
      // Alice AI returns text in output[0].content array
      // Structure: output[0].content[{ type: 'output_text', text: '...' }]
      let generatedText = '';
      
      if (aliceResult.output && aliceResult.output.length > 0) {
        const firstOutput = aliceResult.output[0];
        if (firstOutput.content && Array.isArray(firstOutput.content)) {
          // Extract text from content array
          // Type can be 'output_text' or 'text'
          generatedText = firstOutput.content
            .filter((item: any) => 
              (item.type === 'output_text' || item.type === 'text') && 
              item.text
            )
            .map((item: any) => item.text)
            .join('\n');
        } else if (typeof firstOutput.content === 'string') {
          generatedText = firstOutput.content;
        }
      }
      
      // Fallback to output_text if available
      if (!generatedText && aliceResult.output_text) {
        generatedText = aliceResult.output_text;
      }

      if (!generatedText) {
        console.error('Alice AI response structure:', JSON.stringify(aliceResult, null, 2));
        throw new Error('No text found in Alice AI response');
      }

      // Alice AI may not provide token usage in the same format
      // We'll return undefined for usage if not available
      const usage = aliceResult.usage ? {
        inputTextTokens: (aliceResult.usage.input_tokens || 0).toString(),
        completionTokens: (aliceResult.usage.output_tokens || 0).toString(),
        totalTokens: ((aliceResult.usage.input_tokens || 0) + (aliceResult.usage.output_tokens || 0)).toString(),
      } : undefined;

      return NextResponse.json({
        text: generatedText,
        usage,
      });
    }
    
    // Determine the model URI based on the selected model
    let modelUri: string;
    switch (model) {
      case 'gpt-oss-20b':
        // GPT OSS 20B модель недоступна в данном каталоге
        // Используем YandexGPT как альтернативу
        console.log('Warning: gpt-oss-20b requested but not available, falling back to yandexgpt');
        return NextResponse.json(
          { error: 'Модель GPT OSS 20B недоступна в вашем каталоге. Попробуйте использовать YandexGPT или YandexGPT Lite.' },
          { status: 400 }
        );
      case 'yandexgpt-lite':
        modelUri = `gpt://${folderId}/yandexgpt-lite/latest`;
        break;
      case 'deepseek':
        // Assuming deepseek uses a different endpoint or model URI
        // Fallback to yandexgpt for now as deepseek may not be available
        console.log('Warning: deepseek requested, falling back to yandexgpt');
        modelUri = `gpt://${folderId}/yandexgpt/latest`;
        break;
      case 'yandexgpt':
      default:
        // Use regular YandexGPT model (Pro version may not be available)
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
    // Only YandexGPT supports reasoning mode
    if (reasoningMode && model === 'yandexgpt') {
      console.log('Adding reasoning options for YandexGPT');
      completionOptions.reasoningOptions = {
        mode: "ENABLED_HIDDEN"
      };
      completionOptions.reasoning_effort = "low";
      // Don't enable streaming for now, use regular mode
      // completionOptions.stream = true;
    } else if (reasoningMode && model !== 'yandexgpt') {
      console.log('Reasoning mode requested but only supported for YandexGPT, current model:', model);
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
    
    // Log message details for debugging
    console.log('Messages details:', messages.map((msg, idx) => ({
      index: idx,
      role: msg.role,
      textLength: msg.text?.length || 0,
      textPreview: msg.text?.substring(0, 100) || '[empty]',
      isEmpty: !msg.text || msg.text.trim().length === 0
    })));

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

    // Log reasoning information
    if (reasoningMode) {
      console.log('Reasoning mode result:', {
        reasoningTokens: result.result?.usage?.reasoningTokens || 0,
        reasoningUsed: (result.result?.usage?.reasoningTokens || 0) > 0
      });
    }
    
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
