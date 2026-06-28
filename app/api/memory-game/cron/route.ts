import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import { getCurrentMonthBounds } from '@/shared/lib/memory-game/monthBounds';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const CRON_SECRET = process.env.CRON_SECRET;

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Deletes memory game results from previous months. Schedule on the 1st of each month. */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { start: monthStart } = getCurrentMonthBounds();

    const { data, error } = await supabaseAdmin
      .from('memory_game_results')
      .delete()
      .lt('created_at', monthStart)
      .select('id');

    if (error) {
      console.error('Error resetting memory game results:', error);
      return NextResponse.json({ error: 'Failed to reset memory game results' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: data?.length ?? 0,
      monthStart,
    });
  } catch (error) {
    console.error('Error in memory game cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
