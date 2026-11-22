import { isBlogAdmin, hasElevatedBlogAccess } from '../elevatedBlogAccess';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

function mockSupabase(responses: {
  profile?: { role: string | null } | null;
  userRole?: { role: string } | null;
}): SupabaseClient<Database> {
  const from = jest.fn((table: string) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(async () => {
        if (table === 'profiles') {
          return { data: responses.profile ?? null, error: null };
        }
        if (table === 'user_roles') {
          return { data: responses.userRole ?? null, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return chain;
  });

  return { from } as unknown as SupabaseClient<Database>;
}

describe('elevatedBlogAccess', () => {
  it('isBlogAdmin returns true for profiles.role admin', async () => {
    const client = mockSupabase({ profile: { role: 'admin' } });
    await expect(isBlogAdmin(client, 'user-1')).resolves.toBe(true);
  });

  it('isBlogAdmin falls back to user_roles', async () => {
    const client = mockSupabase({ profile: { role: 'user' }, userRole: { role: 'admin' } });
    await expect(isBlogAdmin(client, 'user-1')).resolves.toBe(true);
  });

  it('hasElevatedBlogAccess includes editor', async () => {
    const client = mockSupabase({ profile: { role: 'editor' } });
    await expect(hasElevatedBlogAccess(client, 'user-1')).resolves.toBe(true);
  });
});