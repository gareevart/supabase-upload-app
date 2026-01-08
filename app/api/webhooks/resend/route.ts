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
        console.log('📬 Resend webhook received:', {
            type: payload.type,
            email_id: payload.data?.email_id,
            has_tags: !!payload.data?.tags,
            timestamp: payload.created_at
        });

        const { type, data } = payload;

        // Attempt to get the broadcast identification
        // 1. From tags (our internal UUID)
        // 2. From email_id (Resend's ID, which we also store)
        const broadcastIdFromTag = data.tags?.broadcast_id;
        const emailId = data.email_id;

        const targetId = broadcastIdFromTag || emailId;

        if (!targetId) {
            console.log('⚠️ No identification found in webhook payload (checked tags.broadcast_id and email_id)');
            return NextResponse.json({ message: 'No ID found' }, { status: 200 });
        }

        let statColumn: 'opened_count' | 'clicked_count' | null = null;

        if (type === 'email.opened') {
            statColumn = 'opened_count';
        } else if (type === 'email.clicked') {
            statColumn = 'clicked_count';
        }

        if (statColumn) {
            console.log(`📈 Incrementing ${statColumn} for broadcast identification: ${targetId}`);

            const { error } = await supabaseAdmin.rpc('increment_broadcast_stat', {
                target_id: targetId,
                stat_column: statColumn
            });

            if (error) {
                console.error('❌ Error updating broadcast stats:', error);
                return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
            }

            console.log(`✅ Successfully updated ${statColumn} for ${targetId}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
