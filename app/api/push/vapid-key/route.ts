import { NextResponse } from 'next/server';
import { getVapidPublicKey, isCnsConfigured } from '@/lib/yandex-cns';

export async function GET() {
  if (!isCnsConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 });
  }

  try {
    const vapidPublicKey = await getVapidPublicKey();
    return NextResponse.json({ vapidPublicKey });
  } catch (error) {
    console.error('[push/vapid-key] Failed to fetch VAPID key:', error);
    return NextResponse.json({ error: 'Failed to fetch VAPID key' }, { status: 500 });
  }
}
