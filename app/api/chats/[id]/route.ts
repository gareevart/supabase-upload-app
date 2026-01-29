import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import type { Database } from '@/lib/types';
import { withApiAuth } from '@/app/auth/withApiAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const BUCKET_NAME = 'public-gareevde';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://storage.yandexcloud.net';

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.BUCKET_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_KEY || '',
  },
});

type Attachment = {
  url?: string;
};

const extractFilePath = (rawUrl: string): string | null => {
  if (!rawUrl) return null;

  try {
    const parsedUrl = new URL(rawUrl);
    const cleanPath = parsedUrl.pathname.replace(/^\/+/, '');

    if (cleanPath.startsWith(`${BUCKET_NAME}/`)) {
      return cleanPath.slice(BUCKET_NAME.length + 1);
    }

    return cleanPath;
  } catch {
    const sanitized = rawUrl.split('?')[0].replace(/^\/+/, '');
    if (!sanitized) return null;
    return sanitized.startsWith(`${BUCKET_NAME}/`)
      ? sanitized.slice(BUCKET_NAME.length + 1)
      : sanitized;
  }
};

const deleteFilesInBatches = async (filePaths: string[]) => {
  const uniquePaths = Array.from(new Set(filePaths)).filter(Boolean);
  if (uniquePaths.length === 0) return;

  const batchSize = 1000;
  for (let i = 0; i < uniquePaths.length; i += batchSize) {
    const batch = uniquePaths.slice(i, i + batchSize);
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: batch.map((path) => ({ Key: path })),
        Quiet: false,
      },
    });

    await s3Client.send(command);
  }
};

export const DELETE = withApiAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const chatId = request.nextUrl.pathname.split('/').pop();
    if (!chatId) {
      return NextResponse.json({ error: 'Chat id is required' }, { status: 400 });
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove: (name: string, options: CookieOptions) => {
            request.cookies.delete(name);
          },
        },
      }
    );

    const { data: chat, error: chatError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('attachments')
      .eq('chat_id', chatId);

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch chat messages' },
        { status: 500 }
      );
    }

    const filePaths = (messages || [])
      .flatMap((message) => (Array.isArray(message.attachments) ? message.attachments : []))
      .map((attachment: Attachment) => (attachment?.url ? extractFilePath(attachment.url) : null))
      .filter((path): path is string => Boolean(path));

    try {
      await deleteFilesInBatches(filePaths);
    } catch (storageError) {
      console.error('Failed to delete chat attachments:', storageError);
      return NextResponse.json(
        { error: 'Failed to delete chat attachments' },
        { status: 500 }
      );
    }

    const { error: deleteMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('chat_id', chatId);

    if (deleteMessagesError) {
      return NextResponse.json(
        { error: 'Failed to delete chat messages' },
        { status: 500 }
      );
    }

    const { error: deleteChatError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', chatId);

    if (deleteChatError) {
      return NextResponse.json(
        { error: 'Failed to delete chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { chatId } });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
});
