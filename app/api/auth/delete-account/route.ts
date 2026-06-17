import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { withApiAuth } from '@/app/auth/withApiAuth';

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

// Storage prefixes that hold per-user files (see CLAUDE.md key data flows)
const STORAGE_PREFIXES = ['profiles', 'featured', 'blog', 'editor-images'];

// Tables that store user data, ordered so children are removed before parents.
// Untyped client is used because chat_* / blog_posts are not in the Database type.
const USER_OWNED_TABLES: Array<{ table: string; column: string }> = [
  { table: 'api_keys', column: 'user_id' },
  { table: 'images', column: 'user_id' },
  { table: 'widget_storage', column: 'user_id' },
  { table: 'widget_grants', column: 'user_id' },
  { table: 'user_widgets', column: 'user_id' },
  { table: 'sent_mails', column: 'user_id' },
  { table: 'broadcast_groups', column: 'user_id' },
  { table: 'blog_posts', column: 'author_id' },
];

// Remove every object under `${prefix}/${userId}/` for each known prefix.
async function deleteUserStorage(userId: string, warnings: string[]) {
  for (const prefix of STORAGE_PREFIXES) {
    const fullPrefix = `${prefix}/${userId}/`;
    try {
      let continuationToken: string | undefined;
      do {
        const listed = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: fullPrefix,
            ContinuationToken: continuationToken,
          }),
        );

        const objects = listed.Contents?.map((item) => ({ Key: item.Key! })).filter(
          (o) => o.Key,
        );

        if (objects && objects.length > 0) {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET_NAME,
              Delete: { Objects: objects },
            }),
          );
        }

        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      warnings.push(`storage:${fullPrefix} -> ${message}`);
    }
  }
}

// Best-effort explicit DB cleanup. auth.users deletion cascades most rows, but we
// remove them up front so a missing ON DELETE CASCADE can never block deleteUser.
async function deleteUserRows(admin: SupabaseClient, userId: string, warnings: string[]) {
  // Chat data is linked through chat_sessions.user_id.
  try {
    const { data: chats } = await admin
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId);

    const chatIds = ((chats || []) as { id: string }[]).map((c) => c.id);
    if (chatIds.length > 0) {
      await admin.from('chat_message_embeddings').delete().in('chat_id', chatIds);
      await admin.from('chat_messages').delete().in('chat_id', chatIds);
    }
    await admin.from('chat_sessions').delete().eq('user_id', userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    warnings.push(`chat -> ${message}`);
  }

  // Broadcast group memberships are linked through broadcast_groups.id.
  try {
    const { data: groups } = await admin
      .from('broadcast_groups')
      .select('id')
      .eq('user_id', userId);

    const groupIds = ((groups || []) as { id: string }[]).map((g) => g.id);
    if (groupIds.length > 0) {
      await admin.from('group_subscribers').delete().in('group_id', groupIds);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    warnings.push(`group_subscribers -> ${message}`);
  }

  for (const { table, column } of USER_OWNED_TABLES) {
    try {
      await admin.from(table).delete().eq(column, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      warnings.push(`${table} -> ${message}`);
    }
  }
}

export const DELETE = withApiAuth(async (_req: NextRequest, user: { id: string }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server is not configured for account deletion' },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Administrators cannot delete their own account.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: 'Could not verify account', details: profileError.message },
      { status: 500 },
    );
  }

  if (profile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Administrator accounts cannot be deleted' },
      { status: 403 },
    );
  }

  const warnings: string[] = [];

  await deleteUserStorage(user.id, warnings);
  await deleteUserRows(admin, user.id, warnings);

  // profiles is cascaded by deleteUser, but delete explicitly as a safety net.
  await admin.from('profiles').delete().eq('id', user.id);

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    return NextResponse.json(
      { error: 'Failed to delete account', details: authError.message, warnings },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, warnings });
});
