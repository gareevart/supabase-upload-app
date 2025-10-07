import { Database } from '@/lib/types';

export type User = Database['public']['Tables']['profiles']['Row'];

export type UserRole = 'admin' | 'editor' | 'user';

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};
