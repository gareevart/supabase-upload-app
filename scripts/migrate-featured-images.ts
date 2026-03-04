import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const BUCKET_NAME = 'public-gareevde';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://storage.yandexcloud.net';
const BUCKET_KEY_ID = process.env.BUCKET_KEY_ID || '';
const BUCKET_SECRET_KEY = process.env.BUCKET_SECRET_KEY || '';
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const LIMIT = Number(process.env.LIMIT || '100');

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: ENDPOINT_URL,
  credentials: {
    accessKeyId: BUCKET_KEY_ID,
    secretAccessKey: BUCKET_SECRET_KEY,
  },
});

function detectDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function extFromMime(mime: string): string | null {
  const type = mime.replace(/^image\//, '').toLowerCase();
  if (type === 'jpeg') return 'jpg';
  if (['jpg', 'png', 'webp', 'gif'].includes(type)) return type;
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; ext: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const ext = extFromMime(mime);
  if (!ext) return null;
  const buffer = Buffer.from(base64, 'base64');
  return { mime, ext, buffer };
}

async function uploadToYandex(params: { buffer: Buffer; mime: string; userId: string; ext: string; folder?: string }) {
  const { buffer, mime, userId, ext, folder = 'featured' } = params;
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `${folder}/${userId}/${ts}-${rand}.${ext}`;
  if (DRY_RUN) {
    return { url: `https://${BUCKET_NAME}.storage.yandexcloud.net/${key}?${ts}`, path: key };
  }
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: '3600',
    ACL: 'public-read',
  }));
  return { url: `https://${BUCKET_NAME}.storage.yandexcloud.net/${key}?${ts}`, path: key };
}

async function main() {
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }
  if (!BUCKET_KEY_ID || !BUCKET_SECRET_KEY) {
    console.error('Missing Yandex storage credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let processed = 0;

  const { data: rows, error } = await supabase
    .from('blog_posts')
    .select('id, author_id, featured_image')
    .like('featured_image', 'data:image%')
    .limit(LIMIT);

  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log('Nothing to migrate');
    return;
  }

  for (const row of rows) {
    if (!detectDataUrl(row.featured_image)) continue;
    const parsed = parseDataUrl(row.featured_image);
    if (!parsed) {
      console.warn(`Skip ${row.id}: invalid data URL`);
      continue;
    }
    const { url } = await uploadToYandex({
      buffer: parsed.buffer,
      mime: parsed.mime,
      ext: parsed.ext,
      userId: row.author_id,
    });
    console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Converted ${row.id} -> ${url}`);
    processed++;
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('blog_posts')
        .update({ featured_image: url, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (upErr) {
        console.error('Update failed for', row.id, upErr);
      }
    }
  }

  console.log(`Done. Processed: ${processed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

