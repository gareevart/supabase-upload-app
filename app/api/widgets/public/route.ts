import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { attachAuthors, attachEnabled, createAdminClient } from '../service';

// GET public widgets from all users
export const GET = withAuth(async (_request: NextRequest, user: { id: string }) => {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withEnabled = await attachEnabled(admin, user.id, data || []);
    return NextResponse.json({ data: await attachAuthors(admin, withEnabled) });
  } catch (error) {
    console.error('Error fetching public widgets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch public widgets' },
      { status: 500 }
    );
  }
});
