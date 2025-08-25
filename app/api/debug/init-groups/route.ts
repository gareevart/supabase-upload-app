import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Initializing broadcast groups system...');

    // Create broadcast_groups table
    const { error: createGroupsError } = await supabaseServer.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS broadcast_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          is_default BOOLEAN DEFAULT false,
          subscriber_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createGroupsError) {
      console.error('Error creating broadcast_groups table:', createGroupsError);
    }

    // Create group_subscribers table
    const { error: createJunctionError } = await supabaseServer.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS group_subscribers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID NOT NULL,
          subscriber_id UUID NOT NULL,
          added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(group_id, subscriber_id)
        );
      `
    });

    if (createJunctionError) {
      console.error('Error creating group_subscribers table:', createJunctionError);
    }

    // Add foreign key constraints
    const { error: fkError1 } = await supabaseServer.rpc('exec', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_subscribers_group_id_fkey') THEN
            ALTER TABLE group_subscribers ADD CONSTRAINT group_subscribers_group_id_fkey 
            FOREIGN KEY (group_id) REFERENCES broadcast_groups(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `
    });

    const { error: fkError2 } = await supabaseServer.rpc('exec', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_subscribers_subscriber_id_fkey') THEN
            ALTER TABLE group_subscribers ADD CONSTRAINT group_subscribers_subscriber_id_fkey 
            FOREIGN KEY (subscriber_id) REFERENCES subscribe(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `
    });

    if (fkError1) console.error('Error adding FK constraint 1:', fkError1);
    if (fkError2) console.error('Error adding FK constraint 2:', fkError2);

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_broadcast_groups_name ON broadcast_groups(name);',
      'CREATE INDEX IF NOT EXISTS idx_broadcast_groups_is_default ON broadcast_groups(is_default);',
      'CREATE INDEX IF NOT EXISTS idx_broadcast_groups_created_at ON broadcast_groups(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_group_subscribers_group_id ON group_subscribers(group_id);',
      'CREATE INDEX IF NOT EXISTS idx_group_subscribers_subscriber_id ON group_subscribers(subscriber_id);'
    ];

    for (const indexSql of indexes) {
      const { error } = await supabaseServer.rpc('exec', { sql: indexSql });
      if (error) {
        console.error('Error creating index:', error);
      }
    }

    // Enable RLS
    const { error: rlsError1 } = await supabaseServer.rpc('exec', {
      sql: 'ALTER TABLE broadcast_groups ENABLE ROW LEVEL SECURITY;'
    });

    const { error: rlsError2 } = await supabaseServer.rpc('exec', {
      sql: 'ALTER TABLE group_subscribers ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError1) console.error('Error enabling RLS on broadcast_groups:', rlsError1);
    if (rlsError2) console.error('Error enabling RLS on group_subscribers:', rlsError2);

    // Create default group
    const { error: defaultGroupError } = await supabaseServer.rpc('exec', {
      sql: `
        INSERT INTO broadcast_groups (name, description, is_default)
        SELECT 'Все подписчики', 'Группа по умолчанию, содержащая всех активных подписчиков', true
        WHERE NOT EXISTS (
          SELECT 1 FROM broadcast_groups WHERE is_default = true
        );
      `
    });

    if (defaultGroupError) {
      console.error('Error creating default group:', defaultGroupError);
    }

    console.log('Broadcast groups system initialized successfully');
    return NextResponse.json('Broadcast groups system initialized successfully');
  } catch (error) {
    console.error('Error in init-groups:', error);
    return NextResponse.json(`Error: ${error}`, { status: 500 });
  }
}