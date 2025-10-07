import { useState, useEffect, useCallback } from 'react';
import { AuthUser, UserRole } from '@/entities/user/model';
import { AuthService } from '@/shared/lib/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication error';
      setError(errorMessage);
      console.error('Auth check error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      router.push('/auth');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      console.error('Sign out error:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [router, toast]);

  const hasRole = useCallback((requiredRoles: UserRole[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }, [user]);

  const isAdmin = useCallback(() => {
    return hasRole(['admin']);
  }, [hasRole]);

  const isEditor = useCallback(() => {
    return hasRole(['admin', 'editor']);
  }, [hasRole]);

  const canAccessBroadcasts = useCallback(() => {
    return isEditor();
  }, [isEditor]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    signOut,
    hasRole,
    isAdmin,
    isEditor,
    canAccessBroadcasts,
    refresh: checkAuth,
  };
};
