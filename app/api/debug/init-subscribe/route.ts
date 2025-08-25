import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Initializing subscribe table...');

    // Create subscribe table
    const { error: createTableError } = await supabaseServer.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS subscribe (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          name TEXT,
          is_active BOOLEAN DEFAULT true,
          subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createTableError) {
      console.error('Error creating subscribe table:', createTableError);
    }

    // Add unique constraint
    const { error: constraintError } = await supabaseServer.rpc('exec', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscribe_email_unique') THEN
            ALTER TABLE subscribe ADD CONSTRAINT subscribe_email_unique UNIQUE (email);
          END IF;
        END $$;
      `
    });

    if (constraintError) {
      console.error('Error adding constraint:', constraintError);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_subscribe_email ON subscribe(email);',
      'CREATE INDEX IF NOT EXISTS idx_subscribe_is_active ON subscribe(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_subscribe_created_at ON subscribe(created_at);'
    ];

    for (const indexSql of indexes) {
      const { error } = await supabaseServer.rpc('exec', { sql: indexSql });
      if (error) {
        console.error('Error creating index:', error);
      }
    }

    // Enable RLS
    const { error: rlsError } = await supabaseServer.rpc('exec', {
      sql: 'ALTER TABLE subscribe ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    }

    console.log('Subscribe table initialized successfully');
    return NextResponse.json('Subscribe table initialized successfully');
  } catch (error) {
    console.error('Error in init-subscribe:', error);
    return NextResponse.json(`Error: ${error}`, { status: 500 });
  }
}