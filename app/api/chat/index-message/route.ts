import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { chatId, messageId, text } = await request.json();
    if (!chatId || !messageId || typeof text !== 'string') {
      return NextResponse.json({ error: 'chatId, messageId and text are required' }, { status: 400 });
    }

    const { getEmbeddings } = await import('@/lib/yandex');

    // simple chunking to ~1800 chars
    const chunks: string[] = (text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/.{1,1800}/g) || [];

    if (chunks.length === 0) {
      return NextResponse.json({ success: false, message: 'Nothing to index' }, { status: 200 });
    }

    // Verify user owns the chat (RLS will also enforce)
    const { data: chat } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Clean previous embeddings for this message to avoid duplicates
    await supabase.from('chat_message_embeddings').delete().eq('message_id', messageId);

    for (const chunk of chunks) {
      try {
        const embedding = await getEmbeddings(chunk, 'DOC');
        const { error: insertError } = await supabase
          .from('chat_message_embeddings')
          .insert({ chat_id: chatId, message_id: messageId, content: chunk, embedding });
        if (insertError) {
          console.error('Insert embedding error:', insertError);
        }
        // minimal pacing
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        console.error('Embedding chunk failed:', e);
      }
    }

    return NextResponse.json({ success: true, chunks: chunks.length });
  } catch (error) {
    console.error('Index message API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

