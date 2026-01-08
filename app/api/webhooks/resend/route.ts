import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

// Create a Supabase client with service role for webhook updates
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        console.log('📬 Resend webhook payload:', JSON.stringify(payload, null, 2));

        const { type, data } = payload;

        // We expect broadcast_id to be in tags
        const broadcastId = data.tags?.broadcast_id;

        if (!broadcastId) {
            console.log('⚠️ No broadcast_id found in webhook payload tags');
            return NextResponse.json({ message: 'No broadcast_id found' }, { status: 200 });
        }

        let statColumn: 'opened_count' | 'clicked_count' | null = null;

        if (type === 'email.opened') {
            statColumn = 'opened_count';
        } else if (type === 'email.clicked') {
            statColumn = 'clicked_count';
        }

        if (statColumn) {
            console.log(`📈 Incrementing ${statColumn} for broadcast ${broadcastId}`);

            const { error } = await supabaseAdmin.rpc('increment_broadcast_stat', {
                broadcast_id_param: broadcastId,
                stat_column: statColumn
            });

            if (error) {
                console.error('❌ Error updating broadcast stats:', error);
                return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
