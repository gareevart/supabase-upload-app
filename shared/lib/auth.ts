import { supabase } from '@/lib/supabase';
import { AuthUser, UserRole } from '@/shared/types/user';

export class AuthService {
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.log('No valid session found:', sessionError?.message);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.log('Profile error:', profileError?.message);
        return null;
      }

      return {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role as UserRole,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static async hasRole(requiredRoles: UserRole[]): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user ? requiredRoles.includes(user.role) : false;
  }

  static async isAdmin(): Promise<boolean> {
    return this.hasRole(['admin']);
  }

  static async isEditor(): Promise<boolean> {
    return this.hasRole(['admin', 'editor']);
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
