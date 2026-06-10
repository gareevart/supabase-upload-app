import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/app/auth/withApiKeyAuth';
import { attachAuthors, attachEnabled, createAdminClient, validateWidgetPayload } from './service';

// GET current user's widgets
export const GET = withAuth(async (_request: NextRequest, user: { id: string }) => {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withEnabled = await attachEnabled(admin, user.id, data || []);
    return NextResponse.json({ data: await attachAuthors(admin, withEnabled) });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch widgets' },
      { status: 500 }
    );
  }
});

// POST create a widget (author gets an auto-grant so the widget is usable immediately)
export const POST = withAuth(async (request: NextRequest, user: { id: string }) => {
  try {
    const body = await request.json();
    const validated = validateWidgetPayload(body);

    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_widgets')
      .insert([
        {
          user_id: user.id,
          title: validated.title!,
          description: validated.description ?? null,
          html: validated.html!,
          permissions: validated.permissions ?? [],
          is_public: validated.is_public ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const { error: grantError } = await admin.from('widget_grants').upsert([
      {
        user_id: user.id,
        widget_id: data.id,
        permissions: validated.permissions ?? [],
        enabled: true,
      },
    ]);

    if (grantError) {
      console.error('Error creating widget grant:', grantError);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create widget' },
      { status: 500 }
    );
  }
});
