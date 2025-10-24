/**
 * Diagnostic script to test broadcasts access
 * Run with: npm run diagnose
 */

import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
const result = require('dotenv').config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Warning: Could not load .env.local file');
  console.warn('Path tried:', envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

async function testBroadcastsAccess() {
  console.log('🔍 Testing Broadcasts Access\n');
  console.log('='.repeat(50));

  // Test 1: Check environment variables
  console.log('\n1️⃣ Checking environment variables...');
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables!');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
    return;
  }
  console.log('✅ Environment variables are set');

  // Test 2: Create Supabase client
  console.log('\n2️⃣ Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created');

  // Test 3: Check session
  console.log('\n3️⃣ Checking session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('❌ Session error:', sessionError.message);
    return;
  }

  if (!session) {
    console.log('⚠️  No active session found');
    console.log('Please log in first by visiting http://localhost:3000/auth');
    return;
  }

  console.log('✅ Session found');
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);

  // Test 4: Check profile
  console.log('\n4️⃣ Checking user profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile error:', profileError.message);
    console.log('\n💡 Tip: Create a profile by visiting http://localhost:3000/debug and clicking "Set Admin Role"');
    return;
  }

  if (!profile) {
    console.log('⚠️  No profile found');
    console.log('\n💡 Tip: Create a profile by visiting http://localhost:3000/debug and clicking "Set Admin Role"');
    return;
  }

  console.log('✅ Profile found');
  console.log('Role:', profile.role || 'No role set');

  // Test 5: Check role permissions
  console.log('\n5️⃣ Checking role permissions...');
  if (!profile.role) {
    console.log('⚠️  No role set');
    console.log('\n💡 Tip: Set your role by visiting http://localhost:3000/debug and clicking "Set Admin Role"');
    return;
  }

  if (!['admin', 'editor'].includes(profile.role)) {
    console.log('⚠️  Insufficient permissions');
    console.log('Current role:', profile.role);
    console.log('Required role: admin or editor');
    console.log('\n💡 Tip: Update your role by visiting http://localhost:3000/debug and clicking "Set Admin Role"');
    return;
  }

  console.log('✅ Role permissions OK');

  // Test 6: Check sent_mails table
  console.log('\n6️⃣ Checking sent_mails table...');
  const { data: broadcasts, error: broadcastsError, count } = await supabase
    .from('sent_mails')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .limit(1);

  if (broadcastsError) {
    console.error('❌ Broadcasts error:', broadcastsError.message);

    if (broadcastsError.message.includes('relation "public.sent_mails" does not exist')) {
      console.log('\n💡 Tip: The sent_mails table does not exist. Run the migration:');
      console.log('   migrations/create_sent_mails_table.sql');
    } else if (broadcastsError.message.includes('permission denied')) {
      console.log('\n💡 Tip: Permission denied. Run the RLS fix migration:');
      console.log('   migrations/fix_broadcasts_rls_policies.sql');
    }
    return;
  }

  console.log('✅ sent_mails table accessible');
  console.log('Total broadcasts:', count);

  // Test 7: Test API endpoint
  console.log('\n7️⃣ Testing API endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/broadcasts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API error:', response.status, errorData);
      return;
    }

    const data = await response.json();
    console.log('✅ API endpoint accessible');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ API request failed:', error);
    console.log('\n💡 Tip: Make sure the development server is running:');
    console.log('   npm run dev');
    return;
  }

  // All tests passed
  console.log('\n' + '='.repeat(50));
  console.log('🎉 All tests passed! You should be able to access broadcasts.');
  console.log('Visit: http://localhost:3000/broadcasts');
}

// Run the tests
testBroadcastsAccess().catch(console.error);
