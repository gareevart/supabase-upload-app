import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET() {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await (supabase as any)
      .from('static_pages')
      .select('*')
      .eq('is_homepage', true)
      .eq('published', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ page: null }, { status: 200 });
    }

    return NextResponse.json({ page: data });
  } catch (error) {
    console.error('Error getting main static page:', error);
    return NextResponse.json({ page: null }, { status: 200 });
  }
}
