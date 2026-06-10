import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { attachAuthors, createAdminClient } from '../service';

// GET widgets enabled for the current user's navigation widgets panel
export const GET = withAuth(async (_request: NextRequest, user: { id: string }) => {
  try {
    const admin = createAdminClient();

    const { data: grants, error: grantsError } = await admin
      .from('widget_grants')
      .select('widget_id')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (grantsError) throw grantsError;

    const widgetIds = (grants || []).map((grant) => grant.widget_id);
    if (widgetIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await admin
      .from('user_widgets')
      .select('*')
      .in('id', widgetIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Drop widgets that became private after the grant was created
    const visible = (data || []).filter(
      (widget) => widget.user_id === user.id || widget.is_public
    );

    return NextResponse.json({ data: await attachAuthors(admin, visible) });
  } catch (error) {
    console.error('Error fetching enabled widgets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch enabled widgets' },
      { status: 500 }
    );
  }
});
